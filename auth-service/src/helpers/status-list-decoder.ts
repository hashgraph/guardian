export class StatusListDecoder {
  private binaryString: string;

  constructor(base64String: string) {
    // Decode the Base64 string
    const binaryData = atob(base64String);

    // Convert the binary data to a binary string
    this.binaryString = '';
    for (let i = 0; i < binaryData.length; i++) {
      const charCode = binaryData.charCodeAt(i);
      const binaryCharCode = charCode.toString(2).padStart(8, '0');
      this.binaryString += binaryCharCode;
    }
  }

  // Get the full binary string
  getBinaryString(): string {
    return this.binaryString;
  }

  // Check the revocation status at a specific position (index)
  isRevoked(position: number): boolean {
    if (position >= 0 && position < this.binaryString.length) {
      return this.binaryString.charAt(position) === '1';
    } else {
      throw new Error('Invalid position. Position should be a valid index in the binary string.');
    }
  }
}
