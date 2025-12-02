import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-container',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./container.component.scss'],
  templateUrl: './container.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalContainerComponent {}
