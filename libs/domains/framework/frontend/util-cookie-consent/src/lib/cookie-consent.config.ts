import { environment } from '@forepath/framework/frontend/util-configuration';
import { NgcCookieConsentConfig } from 'ngx-cookieconsent';

export const cookieConfig: NgcCookieConsentConfig = {
  cookie: {
    domain: environment.cookieConsent.domain,
  },
  position: 'bottom-left',
  theme: 'classic',
  palette: {
    popup: {
      background: '#212529',
    },
    button: {
      background: '#7a3fff',
    },
  },
  type: 'opt-in',
  content: {
    message: 'This website uses cookies to ensure you get the best experience on our website.',
    dismiss: 'Got it!',
    allow: 'Accept',
    deny: 'Decline',
    link: 'Learn more',
    href: environment.cookieConsent.privacyPolicyUrl,
  },
};
