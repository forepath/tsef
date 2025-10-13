import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'landingpage-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
