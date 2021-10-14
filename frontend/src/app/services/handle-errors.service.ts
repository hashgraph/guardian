import { Injectable } from "@angular/core";
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { ToastrService } from "ngx-toastr";

@Injectable()
export class HandleErrorsService implements HttpInterceptor {
  constructor(
    public router: Router,
    private toastr: ToastrService
  ) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error) => {
        console.error(error);
        if (error.error) {
          if (typeof error.error.type === 'undefined') {
            this.toastr.error(`${error.error.message}`, `${error.error.code} Other Error`, {
              timeOut: 10000,
              closeButton: true,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
          } else {
            this.toastr.error(`<div>${error.error.message}</div><div>${error.error.uuid}</div>`, `${error.error.code} ${error.error.type}`, {
              timeOut: 10000,
              closeButton: true,
              positionClass: 'toast-bottom-right',
              enableHtml: true
            });
          }
        } else {
          this.toastr.error(`${error.message}`, `${error.code} Other Error`, {
            timeOut: 10000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            enableHtml: true
          });
        }
        return throwError(error.message);
      })
    );
  }
}
