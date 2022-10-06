import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgxFileDropEntry } from 'ngx-file-drop';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-file-drag-n-drop',
  templateUrl: './file-drag-n-drop.component.html',
  styleUrls: ['./file-drag-n-drop.component.css']
})
export class FileDragNDropComponent implements OnInit {

  @Output() onFileLoaded: EventEmitter<any> = new EventEmitter();
  @Input() dropZoneLabel: string = "";
  @Input() fileExtension: string = 'zip';
  @Input() multiple: boolean = false;

  constructor(
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
  }

  public droppedFile(files: NgxFileDropEntry[]) {
    if (files.length > 1) {
      if (!this.multiple) {
        this.toastr.error("Cannot add more than 1 files", "File import error", { positionClass: 'toast-bottom-right' })
        return;
      }
      const filteredFiles = files.filter(file => this.checkFile(file));
      if (filteredFiles.length > 0) {
        this.onFileLoaded.emit(filteredFiles.map(file => file.fileEntry));
      }
    } else {
        const droppedFile = files[0];
        if (this.checkFile(droppedFile)) {
          const fileEntry = droppedFile.fileEntry as any;
          fileEntry.file((file: File) => {
            this.onFileLoaded.emit(file);
          });
        }
    }
  }

  private checkFile(droppedFile: NgxFileDropEntry) {
    if (droppedFile.fileEntry.isFile && this.isFileAllowed(droppedFile.fileEntry.name)) {
      return true;
    } else {
      this.toastr.error(`Only files in '.${this.fileExtension}' format are accepted`, "File import error", { positionClass: 'toast-bottom-right' });
      return false;
    }
  }

  public importFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `.${this.fileExtension}`;
    input.multiple = this.multiple;
    input.click();
    input.onchange = (e: any) => {
      if (!this.multiple) {
        const file = e.target.files[0];
        this.onFileLoaded.emit(file);
      } else {
        this.onFileLoaded.emit(e.target.files);
      }
    }
  }

  private isFileAllowed(fileName: string) {
    if (this.fileExtension === '*') {
      return true;
    }
    
    let isFileAllowed = false;
    const allowedFiles = [`.${this.fileExtension}`];
    const regex = /(?:\.([^.]+))?$/;
    const extension = regex.exec(fileName);
    if (extension) {
      for (const ext of allowedFiles) {
        if (ext === extension[0]) {
          isFileAllowed = true;
        }
      }
    }
    return isFileAllowed;
  }
}
