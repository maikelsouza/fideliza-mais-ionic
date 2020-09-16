import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { EstabelecimentoService } from '../shared/services/estabelecimento.service';
import { Estabelecimento } from '../shared/models/estabelecimento';
import { ClienteEstabelecimento } from '../shared/models/cliente-estabelecimento';
import { AutenticadorService } from 'src/app/common/service/autenticador.service';
import { Usuario } from 'src/app/usuarios/shared/models/usuario';
import { ClienteEstabelecimentoService } from '../shared/services/cliente-estabelecimento.service';
import { AlertaService } from 'src/app/common/service/alerta.service';
import { EstabelecimentoVO } from '../shared/vos/estabelecimento-vo';
import { TotalPontosClienteProgramaFidelidadeService } from 'src/app/pontosClientes/shared/services/total-pontos-cliente-programa-fidelidade.service';
import { TotalPontosClienteProgramaFidelidade } from 'src/app/pontosClientes/shared/models/total-pontos-cliente-programa-fidelidade';

@Component({
  selector: 'app-lista-estabelecimento',
  templateUrl: './lista-estabelecimento.page.html',
  styleUrls: ['./lista-estabelecimento.page.scss'],
})
export class ListaEstabelecimentoPage implements OnInit, OnDestroy {

  estabelecimentos: Array<Estabelecimento> = new Array<Estabelecimento>(); 
  estabelecimentoVos: Array<EstabelecimentoVO> = new Array<EstabelecimentoVO>(); 
  clienteEstabelecimento: Array<ClienteEstabelecimento> = new Array<ClienteEstabelecimento>(); 
  totalPontosClienteProgramaFidelidade: Array<TotalPontosClienteProgramaFidelidade> = new Array<TotalPontosClienteProgramaFidelidade>(); 
  tipoUsuario : string;
  inscricao: Subscription;
  inscricaoCarregarListaEstabelecimentos: Subscription;
  usuarioLogado: Usuario;
  
  constructor(
      private estabelecimentoSrv: EstabelecimentoService,
      private clienteEstabelecimentoService: ClienteEstabelecimentoService,  
      private totalPontosClienteProgramaFidelidadeService: TotalPontosClienteProgramaFidelidadeService,    
      private route: ActivatedRoute,
      private alertSrv: AlertaService,
      private router: Router
      ) 
      { }

  ngOnInit() {    
    console.log("ngOnInit - lista estabelecimento");
    this.usuarioLogado = AutenticadorService.UsuarioLogado;      
    this.inscricao = this.route.queryParams.subscribe(
      (queryParams: any) => {
        this.tipoUsuario = queryParams['tipoUsuario'];
      }
    ); 
    this.inscricaoCarregarListaEstabelecimentos = this.estabelecimentoSrv.emitirListarEstabelecimento.subscribe(
      () => {       
        this.carregarListaEstabelecimento();
      }
    );  
    this.carregarListaEstabelecimento();
  }

  ngOnDestroy(){         
    console.log("ngOnDestroy - lista estabelecimento");
    this.inscricao.unsubscribe();
    this.inscricaoCarregarListaEstabelecimentos.unsubscribe();
  }

  async carregarListaEstabelecimento(): Promise<void> {
    try {      
      let estabelecimentoResultado = undefined;     
      let clienteEstabelecimentoResultado;  
      let totalPontosClienteProgramaFidelidadeResultado;
      const idUsuario = this.usuarioLogado[0].id;
      if (this.tipoUsuario == "ESTABELECIMENTOS"){
        estabelecimentoResultado = await this.estabelecimentoSrv.buscarPorIdUsuario(idUsuario);           
        if (estabelecimentoResultado.success) {
          this.estabelecimentos = <Array<Estabelecimento>>estabelecimentoResultado.data;                  
        }
      }else if (this.tipoUsuario == "CLIENTES"){
          estabelecimentoResultado = await this.estabelecimentoSrv.buscarComProgramaFidelidadeOuCartaoFidelidade();
          if(estabelecimentoResultado.success){            
            this.estabelecimentoVos =  <Array<EstabelecimentoVO>>estabelecimentoResultado.data;                 
            clienteEstabelecimentoResultado = await this.clienteEstabelecimentoService.buscarPorIdUsuario(idUsuario);            
            this.clienteEstabelecimento = <Array<ClienteEstabelecimento>>clienteEstabelecimentoResultado.data;        
            clienteEstabelecimentoResultado = await this.clienteEstabelecimentoService.buscarPorIdUsuario(idUsuario);            
            totalPontosClienteProgramaFidelidadeResultado = await this.totalPontosClienteProgramaFidelidadeService.buscarPorIdUsuarioEAtivo(idUsuario,true);
            this.totalPontosClienteProgramaFidelidade = <Array<TotalPontosClienteProgramaFidelidade>>totalPontosClienteProgramaFidelidadeResultado.data;        
            this.descobrirPontuacaoClientes();
            this.descobrirClientesAssociadosEstabelecimentos();
            this.popularTelefoneCelular();
            this.popularMidiaSocial();
          }          
      }else{ 
        estabelecimentoResultado = await this.estabelecimentoSrv.buscarTodos();
        if (estabelecimentoResultado.success) {
          this.estabelecimentos = <Array<Estabelecimento>>estabelecimentoResultado.data;        
        }
      } 
    } catch (error) {
      console.log('Erro ao carregar os estabelecimentos', error);
    }
  }

  visualizarDetalhesEstabelecimento(item : EstabelecimentoVO){
    this.router.navigateByUrl('/estabelecimento/visualizar',{
      state: { estabelecimentoVO: item }
    });

  }

  async associarClienteEstabelecimento(estabelecimentoId: number){
    try { 
      let clienteEstabelecimento : ClienteEstabelecimento = new ClienteEstabelecimento(); 
      clienteEstabelecimento.dataCriacao = new Date();
      clienteEstabelecimento.estabelecimentoId = estabelecimentoId;
      clienteEstabelecimento.usuarioId = this.usuarioLogado[0].id;
      let resultado = await this.clienteEstabelecimentoService.salvar(clienteEstabelecimento);
      if (resultado.success){
        this.alertSrv.toast('Cliente associado com sucesso!');        
        await this.estabelecimentoSrv.notificarListaEstabelecimento();
        this.router.navigate(['/estabelecimento/lista'],{ queryParams: { tipoUsuario: this.usuarioLogado[0].GrupoUsuario.nome } });             
      }
    } catch (error) {
        console.log('Erro ao associar um cliente a um estabelecimento', error);    
    }
  }

  async desassociarClienteEstabelecimento(estabelecimentoId: number) {
    try {
      let clienteEstabelecimento : ClienteEstabelecimento = new ClienteEstabelecimento(); 
      clienteEstabelecimento.dataCriacao = new Date();
      clienteEstabelecimento.estabelecimentoId = estabelecimentoId;
      clienteEstabelecimento.usuarioId = this.usuarioLogado[0].id;      
      let resultado = await this.clienteEstabelecimentoService.deletePorUsuarioEEstabelecimento(this.usuarioLogado[0].id, estabelecimentoId);
      if (resultado.success) {
        this.alertSrv.toast('Cliente desassociar com sucesso!');
        await this.estabelecimentoSrv.notificarListaEstabelecimento();
        this.router.navigate(['/estabelecimento/lista'],{ queryParams: { tipoUsuario: this.usuarioLogado[0].GrupoUsuario.nome } });                                                    
      }
    } catch (error) {
      console.log('Erro ao desassociar um cliente a um estabelecimento', error);
    }
  }

  descobrirClientesAssociadosEstabelecimentos(){
    this.estabelecimentoVos.forEach(estabelecimentoVo => {
      estabelecimentoVo.usuarioEstahAssociado = false;
      this.clienteEstabelecimento.forEach(clienteEstabelecimento => {
        if (estabelecimentoVo.programaFidelidadeAlias[0].id == clienteEstabelecimento.estabelecimentoId){
          estabelecimentoVo.usuarioEstahAssociado = true;                                     
        }        
      });      
    });    
  }

  descobrirPontuacaoClientes(){
    this.estabelecimentoVos.forEach(estabelecimentoVo => {
      estabelecimentoVo.usuarioEstahAssociado = false;
      this.totalPontosClienteProgramaFidelidade.forEach(totalPontosClienteProgramaFidelidade => {
        if (estabelecimentoVo.programaFidelidadeAlias[0].id == totalPontosClienteProgramaFidelidade.programaFidelidadeId){
          estabelecimentoVo.totalPontosCliente = totalPontosClienteProgramaFidelidade.totalPontos;
        }else{
          estabelecimentoVo.totalPontosCliente = 0;
        }        
      });      
    });    
  }

  private async popularTelefoneCelular(){
    this.estabelecimentoVos.forEach(estabelecimentoVo => {
      estabelecimentoVo.Telefones.forEach(telefone =>{
        if (telefone.ativo && telefone.tipo == "Celular"){
          estabelecimentoVo.teleneCelular = telefone.numero;
        }
      })
    });    
  }

  private async popularMidiaSocial(){
    this.estabelecimentoVos.forEach(estabelecimentoVo => {
      estabelecimentoVo.MidiaSocials.forEach(midiaSocial =>{
        // Realizar um refactory dessa parte, ou seja, criar um cadastro dos tipos de mídias sociais para realizar o teste
        if (midiaSocial.ativo && midiaSocial.nome == "Instagram"){
          estabelecimentoVo.urlMidiaSocial = midiaSocial.url; 
        }
      })
    });    
  }


}
