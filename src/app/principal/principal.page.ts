import { Component, OnInit} from '@angular/core';

import { Usuario } from '../usuarios/shared/models/usuario';
import { AutenticadorService } from '../common/service/autenticador.service';
import { NavController } from '@ionic/angular';
import { UsuarioService } from '../usuarios/shared/services/usuario.service';

@Component({
  selector: 'app-principal',
  templateUrl: 'principal.page.html',
  styleUrls: ['principal.page.scss'],
})
export class PrincipalPage  implements OnInit {

  usuarioLogado: Usuario;  

  constructor(    
    private navController: NavController
  ){}


ngOnInit(){  
  console.info("ngOnInit - principal");
   this.usuarioLogado = AutenticadorService.UsuarioLogado;     
}

ngOnDestroy(){         
  console.info("ngOnDestroy - principal");  
}

logoff(){
  UsuarioService.RemoverLogin();
  this.navController.navigateRoot('/');      
}

}
