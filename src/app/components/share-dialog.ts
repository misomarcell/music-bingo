import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-share-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule],
  template: `
    <h2 mat-dialog-title>Share List</h2>
    <mat-dialog-content>
      <p>Copy this link and send it to share your list:</p>
      <mat-form-field appearance="outline" class="share-url-field" subscriptSizing="dynamic">
        <input matInput [value]="data.url" readonly #urlInput />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
      <button mat-flat-button (click)="copyUrl(urlInput)">
        <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .share-url-field {
      width: 100%;
    }
  `,
})
export class ShareDialog {
  data = inject<{ url: string }>(MAT_DIALOG_DATA);
  copied = false;

  copyUrl(input: HTMLInputElement): void {
    navigator.clipboard.writeText(input.value).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }
}
