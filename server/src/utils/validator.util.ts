export class Validator {
  static isValidMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 1000) {
      return { valid: false, error: 'Message too long (max 1000 characters)' };
    }
    
    return { valid: true };
  }
  
  static sanitizeMessage(message: string): string {
    return message.trim();
  }
}