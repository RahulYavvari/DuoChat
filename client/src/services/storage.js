const USER_ID_KEY = 'anonymous_chat_user_id';

export class StorageService {
  static getUserId() {
    return localStorage.getItem(USER_ID_KEY);
  }

  static setUserId(userId) {
    localStorage.setItem(USER_ID_KEY, userId);
  }

  static clearUserId() {
    localStorage.removeItem(USER_ID_KEY);
  }

  static hasUserId() {
    return !!this.getUserId();
  }

  static generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  static getOrCreateUserId() {
    let userId = this.getUserId();
    if (!userId) {
      userId = this.generateUserId();
      this.setUserId(userId);
    }
    return userId;
  }
}
