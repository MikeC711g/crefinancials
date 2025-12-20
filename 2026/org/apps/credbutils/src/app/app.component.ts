import { Component } from '@angular/core';
import { HeadersComponent } from './components/headers/headers.component';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'credbutils-root',
  standalone: true,
  imports: [HeadersComponent, RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'credbutils';
}
