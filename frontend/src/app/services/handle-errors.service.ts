import { Injectable } from "@angular/core";
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { ToastrService } from "ngx-toastr";

/**
 * Error interceptor.
 */
@Injectable()
export class HandleErrorsService implements HttpInterceptor {
  constructor(
    public router: Router,
    private toastr: ToastrService
  ) {
  }

  messageToText(message:any) {
    if(typeof message === 'object') {
      return JSON.stringify(message, null, 2);
    }
    return message;
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error) => {
        console.error(error);
        let header = "";
        let text = "";
        if (typeof error.error === 'string') {
          header = `${error.status} ${error.statusText}`;
          if(error.message) {
            text = `<div>${this.messageToText(error.message)}</div><div>${this.messageToText(error.error)}</div>`;
          } else {
            text = `${error.error}`;
          }
        } else if (typeof error.error === 'object') {
          if (error.error.uuid) {
            text = `<div>${this.messageToText(error.error.message)}</div><div>${error.error.uuid}</div>`;
          } else {
            text = `${this.messageToText(error.error.message)}`;
          }
          if (error.error.type) {
            header = `${error.error.code} ${error.error.type}`;
          } else {
            header = `${error.error.code} Other Error`;
          }
        } else {
          header = `${error.code || error.status} Other Error`
          text = `${this.messageToText(error.message)}`;
        }
        this.toastr.error(text, header, {
          timeOut: 30000,
          closeButton: true,
          positionClass: 'toast-bottom-right',
          enableHtml: true
        });
        return throwError(error.message);
      })
    );
  }
}
