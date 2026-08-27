import { renderTemplate } from './render-template';

describe('renderTemplate', () => {
  it('replaces placeholders with provided values', () => {
    const rendered = renderTemplate('[Interface]\nAddress = {{address}}\nMTU = {{mtu}}\n', {
      address: '10.200.0.1',
      mtu: 1420,
    });

    expect(rendered).toContain('Address = 10.200.0.1');
    expect(rendered).toContain('MTU = 1420');
  });
});
