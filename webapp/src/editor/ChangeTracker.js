export class ChangeTracker {
  constructor(onChangeCallback) {
    this.onChangeCallback = onChangeCallback;
    this.originalContent = '';
    this.hasUnsavedChanges = false;
    this.changeDetectionInterval = null;
  }

  // Reset unsaved changes flag
  resetChangeTracking(content) {
    this.hasUnsavedChanges = false;
    this.originalContent = content;
    if (this.onChangeCallback) {
      this.onChangeCallback(false);
    }
  }

  // Set up polling for changes
  setupChangeDetection(getCurrentContentFn) {
    // Clean up any existing interval
    if (this.changeDetectionInterval) {
      clearInterval(this.changeDetectionInterval);
    }
    
    // Check for changes every second
    this.changeDetectionInterval = setInterval(() => {
      this.checkForChanges(getCurrentContentFn);
    }, 1000);
  }

  // Check if content has changed from original
  checkForChanges(getCurrentContentFn) {
    const currentContent = getCurrentContentFn();
    
    if (currentContent !== this.originalContent) {
      this.hasUnsavedChanges = true;
      if (this.onChangeCallback) {
        this.onChangeCallback(true);
      }
    }
  }

  cleanup() {
    if (this.changeDetectionInterval) {
      clearInterval(this.changeDetectionInterval);
      this.changeDetectionInterval = null;
    }
  }

  getHasUnsavedChanges() {
    return this.hasUnsavedChanges;
  }
}
