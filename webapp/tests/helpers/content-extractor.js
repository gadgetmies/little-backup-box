export class ContentExtractor {
  constructor(page) {
    this.page = page;
  }

  async extractPageTitle() {
    const h1 = await this.page.$('h1');
    const h4 = await this.page.$('h4');
    const title = h1 || h4;
    return title ? await title.textContent() : '';
  }

  async extractSectionHeaders() {
    const headers = await this.page.$$eval('h3, h4, h6, [class*="MuiTypography-h6"]', (elements) =>
      elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );
    return headers;
  }

  async extractButtonText() {
    const buttons = await this.page.$$eval('button, [role="button"]', (elements) =>
      elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );
    return buttons;
  }

  async extractFormLabels() {
    const labels = await this.page.$$eval(
      'label, [class*="MuiFormLabel"], [class*="MuiInputLabel"]',
      (elements) => elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );
    return labels;
  }

  async extractRadioButtonLabels() {
    const radios = await this.page.$$eval(
      'input[type="radio"] + label, [class*="MuiFormControlLabel"]',
      (elements) => elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );
    return radios;
  }

  async extractCheckboxLabels() {
    const checkboxes = await this.page.$$eval(
      'input[type="checkbox"] + label, [class*="MuiCheckbox"]',
      (elements) => {
        return elements
          .map((el) => {
            const label = el.closest('label') || el.parentElement?.querySelector('span');
            return label?.textContent?.trim();
          })
          .filter(Boolean);
      }
    );
    return checkboxes;
  }

  async extractSelectOptions(selector) {
    const select = await this.page.$(selector);
    if (!select) return [];
    await select.click();
    await this.page.waitForTimeout(200);
    const options = await this.page.$$eval('[role="option"]', (elements) =>
      elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );
    await this.page.keyboard.press('Escape');
    return options;
  }

  async extractCardContent() {
    const cards = await this.page.$$eval('[class*="MuiCard"], .card', (elements) =>
      elements.map((card) => {
        const header = card.querySelector('h3, h4, h6, [class*="MuiTypography-h6"]');
        const content = card.textContent?.trim();
        return {
          header: header?.textContent?.trim() || '',
          content: content || '',
        };
      })
    );
    return cards;
  }

  async extractAllVisibleText() {
    const body = await this.page.$('body');
    if (!body) return '';
    return await body.textContent();
  }

  async extractAlertMessages() {
    const alerts = await this.page.$$eval(
      '[role="alert"], [class*="MuiAlert"], .alert',
      (elements) => elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );
    return alerts;
  }

  async extractTableData(selector = 'table') {
    const table = await this.page.$(selector);
    if (!table) return [];
    return await table.$$eval('tr', (rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll('td, th');
        return Array.from(cells).map((cell) => cell.textContent?.trim());
      })
    );
  }

  async extractListItems(selector = 'ul, ol, [class*="MuiList"]') {
    const list = await this.page.$(selector);
    if (!list) return [];
    return await list.$$eval('li, [class*="MuiListItem"]', (items) =>
      items.map((item) => item.textContent?.trim()).filter(Boolean)
    );
  }
}







