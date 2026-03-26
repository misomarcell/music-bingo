import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface ListNameDialogData {
  title: string;
  label: string;
  confirmText: string;
  name?: string;
}

@Component({
  selector: 'app-list-name-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
        <mat-label>{{ data.label }}</mat-label>
        <input matInput [(ngModel)]="listName" (keydown.enter)="submit()" cdkFocusInitial />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!listName.trim()" (click)="submit()">
        {{ data.confirmText }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width {
      width: 100%;
    }
  `,
})
export class ListNameDialog {
  readonly data: ListNameDialogData = inject(MAT_DIALOG_DATA);
  listName = this.data.name ?? '';

  private dialogRef = inject(MatDialogRef<ListNameDialog>);

  submit(): void {
    if (this.listName.trim()) {
      this.dialogRef.close(this.listName);
    }
  }
}
