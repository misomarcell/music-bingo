import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-new-list-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>New List</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
        <mat-label>List name</mat-label>
        <input matInput [(ngModel)]="listName" (keydown.enter)="submit()" cdkFocusInitial />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="!listName.trim()" (click)="submit()">Create</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class NewListDialog {
  listName = '';

  constructor(private dialogRef: MatDialogRef<NewListDialog>) {}

  submit(): void {
    if (this.listName.trim()) {
      this.dialogRef.close(this.listName);
    }
  }
}
