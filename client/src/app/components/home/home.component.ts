import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';


@Component({
	selector: 'home',
	templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit{
	public title:string;

	constructor(){
		this.title = 'Bienvenido a ADAits Social'
	}

	ngOnInit(){
		console.log('home.component cargado !!');
	}
}