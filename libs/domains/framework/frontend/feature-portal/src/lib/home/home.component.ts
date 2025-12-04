import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-home',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalHomeComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  ngOnInit(): void {
    this.titleService.setTitle('Agenstra - Centralized Control for Distributed AI Agent Infrastructure');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'Agenstra provides centralized control for distributed AI agent infrastructure. Manage multiple agent-manager instances, interact with agents in real-time, and edit code directly in their containers - all from one powerful dashboard.',
      },
      {
        name: 'keywords',
        content:
          'Agenstra, AI agents, agent management, distributed systems, AI agent infrastructure, agent platform, AI agent console, container management, WebSocket agents, Docker agents',
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com' },
    ]);
  }
}
