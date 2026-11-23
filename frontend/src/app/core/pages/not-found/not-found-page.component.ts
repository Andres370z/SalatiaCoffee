import { Component } from '@angular/core';

import { APP_URLS } from '@routes/route-paths';

@Component({
  selector: 'app-not-found-page',
  templateUrl: './not-found-page.component.html',
})
export class NotFoundPageComponent {
  protected readonly inicio = APP_URLS.root;
}
