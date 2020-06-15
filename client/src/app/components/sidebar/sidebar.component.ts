import { Component, OnInit, EventEmitter, Input, Output } from "@angular/core";
import { Router, ActivatedRoute, Params } from '@angular/router';
import { UserService } from '../../services/user.service';
import { Publication } from '../../models/publication';
import { PublicationService } from '../../services/publication.service';
import { UploadService } from '../../services/upload.service';
import { User } from '../../models/user';
import { Follow } from '../../models/follow';
import { FollowService } from '../../services/follow.service';
import { GLOBAL } from '../../services/global';

@Component({
	selector: 'sidebar',
	templateUrl: './sidebar.component.html',
	providers: [UserService, PublicationService, UploadService, FollowService]
	
})
export class SidebarComponent implements OnInit {
	public identity;
	public token;
	public stats;
	public url;
	public status;
	public publication: Publication;
	public title: string;
	public user: User;
	public followed;
	public following;


	constructor(
		private _userService: UserService,
		private _publicationService: PublicationService,
		private _uploadService: UploadService,
		private _route: ActivatedRoute,
		private _router: Router,
		private _followService: FollowService
	) {
		this.identity = this._userService.getIdentity();
		this.token = this._userService.getToken();
		this.stats = this._userService.getStats();
		this.url = GLOBAL.url;
		this.publication = new Publication("", "", "", "", this.identity._id);
		this.followed = false;
		this.following = false;
	}

	ngOnInit() {
		console.log("sidebar.component ha sido cargado!!");
	}
	loadPage(){
		this._route.params.subscribe(params => {
			let id = params['id'];

			this.getUser(id);
			this.getCounters(id);
		});
	}
	
	getUser(id){
		this._userService.getUser(id).subscribe(
			response => {
				if(response.user){
					console.log(response);
					this.user = response.user;

					if(response.following && response.following._id){
						this.following = true;
					}else{
						this.following = false;
					}

					if(response.followed && response.followed._id){
						this.followed = true;
					}else{
						this.followed = false;
					}

				}else{
					this.status = 'error';
				}
			},	
			error => {
				console.log(<any>error);
				// Esto me lleva al perfil de mi usuario, por si es escrito mal en la barra de navegador su id
				this._router.navigate(['/perfil',this.identity._id]);
			}
		);
	}

	getCounters(id){
		this._userService.getCounters(id).subscribe(
			response => {
				this.stats = response;
			},
			error => {
				console.log(<any>error);
			}
		);
	}

	followUser(followed){
		var follow = new Follow('',this.identity._id,followed);

		this._followService.addFollow(this.token, follow).subscribe(
			response => {
				this.following = true;
			},
			error => {
				console.log(<any>error);
			}
		);
	}

	unfollowUser(followed){
		this._followService.deleteFollow(this.token, followed).subscribe(
			response => {
				this.following = false;
			},
			error => {
				console.log(<any>error);
			}
		);
	}


	onSubmit(form, $event) {
		this._publicationService.addPublication(this.token, this.publication).subscribe(
			response => {
				if (response.publication) {
					this.publication = response.publication;

					if (this.filesToUpload && this.filesToUpload.length) {
						//Subir imagen
						this._uploadService.makeFileRequest(this.url + 'upload-image-pub/' + response.publication._id, [], this.filesToUpload, this.token, 'image')
							.then((result: any) => {
								this.status = 'success';
								this.publication.file = result.image;
								form.reset();
								this._router.navigate(['/timeline']);
								this.sended.emit({ send: 'true' });
							});
					} else {
						this.status = 'success';
						form.reset();
						this._router.navigate(['/timeline']);
						this.sended.emit({ send: 'true' });
					}

				} else {
					this.status = 'error';
				}
			},
			error => {
				var errorMessage = <any>error;
				console.log(errorMessage);
				if (errorMessage != null) {
					this.status = 'error';
				}
			}
		);
	}

	public filesToUpload: Array<File>;
	fileChangeEvent(fileInput: any) {
		this.filesToUpload = <Array<File>>fileInput.target.files;
	}
	/**
	 * Uso el decorador Output, genero evento con EventEmmiter
	 * Con sendPublication lanzo un evento cuando envio una publicacion, 
	 * este llama al sidebar del componente padre timeline que refresca la pantalla y 
	 * pinta la publicacion la primera de la lista de publicaciones.
	 */
	// Output
	@Output() sended = new EventEmitter();
	sendPublication(event) {
		console.log(event);
		this.sended.emit({ send: 'true' });
	}

}