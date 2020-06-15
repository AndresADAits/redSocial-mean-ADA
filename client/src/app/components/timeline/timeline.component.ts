import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Publication } from '../../models/publication';
import { GLOBAL } from '../../services/global';
import { UserService } from '../../services/user.service';
import { PublicationService } from '../../services/publication.service';

/**
 * El siguiente declare es para usar Jquery en Angular:
 * https://www.angularjswiki.com/angular/how-to-install-and-use-jquery-in-angular-projects/
 */
declare var $: any;
@Component({
	selector: 'timeline',
	templateUrl: './timeline.component.html',
	providers: [UserService, PublicationService]

})
export class TimelineComponent implements OnInit {
	public title: string;
	public identity;
	public token;
	public url: string;
	public status: string;
	public page;
	public total;
	public pages;
	public itemsPerPage;
	public publications: Publication[];
	public showImage;

	constructor(
		private _route: ActivatedRoute,
		private _router: Router,
		private _userService: UserService,
		private _publicationService: PublicationService
	) {
		this.title = 'Timeline';
		this.identity = this._userService.getIdentity();
		this.token = this._userService.getToken();
		this.url = GLOBAL.url;
		this.page = 1;
	}

	ngOnInit() {
		
		console.log('timeline.component cargado correctamente!!');
		this.getPublications(this.page);
	}


	getPublications(page, adding = false){
		this._publicationService.getPublications(this.token, page).subscribe(
			response => {
				if(response.publications){
					this.total = response.total_items;
					this.pages = response.pages;
					this.itemsPerPage = response.items_per_page;

					if(!adding){
						this.publications = response.publications;
					}else{
						var arrayA = this.publications;
						var arrayB = response.publications;
						this.publications = arrayA.concat(arrayB);

						$("html, body").animate({ scrollTop: $('body').prop("scrollHeight")}, 500);
					}

					if(page > this.pages){
						//this._router.navigate(['/home']);
					}
				}else{
					this.status = 'error';
				}
			},
			error => {
				var errorMessage = <any>error;
				console.log(errorMessage);
				if(errorMessage != null){
					this.status = 'error';
				}
			}
		);
	}

	public noMore = false;
	viewMore() {
		this.page += 1;

		if (this.page == this.pages) {
			this.noMore = true;
		}

		this.getPublications(this.page, true);
	}

	refresh(event = null){
		// pongo 1, ya que si pongo this.page
		//al darle al scroll, si hago otra publicacion 
		//no me mostraria la primera, ya que no estoy en la pagina 1,
		// solo subiria arriba en la pagina que me encontrase navegando.
/**
 * Resumiendo: Con esto consigo que si estoy en otra pagina de las publicaciones, volver a la pagina 1,
 * tras hacer una publicacion, y que al refescar la página este arriba del todo.
 */
		this.getPublications(1);
	}

	showThisImage(id){
		this.showImage = id;
	}

	hideThisImage(id){
		this.showImage = 0;
	}

	deletePublication(id){
		this._publicationService.deletePublication(this.token, id).subscribe(
			response => {
				this.refresh();
			},
			error => {
				console.log(<any>error);
			}
		);
	}
}