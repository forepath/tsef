import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ComparisonComponent } from './comparison/comparison.component';
import { FaqComponent } from './faq/faq.component';
import { GetStartedComponent } from './get-started/get-started.component';
import { HeroComponent } from './hero/hero.component';
import { HowItWorksComponent } from './how-it-works/how-it-works.component';
import { ProofComponent } from './proof/proof.component';
import { TechnologyComponent } from './technology/technology.component';
import { WhatYouGetComponent } from './what-you-get/what-you-get.component';
import { WhoBenefitsComponent } from './who-benefits/who-benefits.component';
import { WhyTsefComponent } from './why-tsef/why-tsef.component';

@Component({
  selector: 'landingpage-landingpage-frontend-feature-home',
  imports: [
    ComparisonComponent,
    HowItWorksComponent,
    ProofComponent,
    WhatYouGetComponent,
    WhoBenefitsComponent,
    WhyTsefComponent,
    HeroComponent,
    TechnologyComponent,
    FaqComponent,
    GetStartedComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  titleService = inject(Title);
  metaService = inject(Meta);

  constructor() {
    this.titleService.setTitle('The AI-ready TypeScript Enterprise Framework | TSEF');
    this.metaService.addTags([
      { name: 'description', content: 'Home' },
      { name: 'keywords', content: 'Home' },
    ]);
  }
}
