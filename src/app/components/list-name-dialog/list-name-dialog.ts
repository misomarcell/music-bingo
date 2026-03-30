import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ListNameDialogData {
  title: string;
  label: string;
  confirmText: string;
  name?: string;
}

@Component({
  selector: 'app-list-name-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './list-name-dialog.html',
  styleUrl: './list-name-dialog.scss',
})
export class ListNameDialog {
  readonly data: ListNameDialogData = inject(MAT_DIALOG_DATA);
  listName = this.data.name ?? '';

  private readonly dialogRef = inject(MatDialogRef<ListNameDialog>);

  submit(): void {
    if (this.listName.trim()) {
      this.dialogRef.close(this.listName);
    }
  }
}
