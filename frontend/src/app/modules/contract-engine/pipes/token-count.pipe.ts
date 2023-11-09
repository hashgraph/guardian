import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'tokenCount'
})
export class TokenCount implements PipeTransform {
  transform(value: number, decimals: number = 0): string {
    return value ? (value / Math.pow(10, decimals)).toString() : '';
  }
}