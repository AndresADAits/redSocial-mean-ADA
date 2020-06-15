import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { UserService } from './user.service';

@Injectable()
export class UserGuard implements CanActivate{

	constructor(
		private _router: Router,
		private _userService: UserService	
	){}
// Esta función la usaremos para evitar que se pueda acceder a datos privados de los usuarios, usando en las rutas  canActivate:[UserGuard]
	canActivate(){
		let identity = this._userService.getIdentity();

		if(identity && (identity.role == 'ROLE_USER' || identity.role == 'ROLE_ADMIN')){
			return true;
		}else{
			this._router.navigate(['/login']);
			return false;
		}
	}
}