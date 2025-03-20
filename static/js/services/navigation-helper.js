/**
 * Navigation Helper
 * Manages component lifecycle and navigation
 */

class NavigationHelper {
    constructor() {
        this.currentComponent = null;
        this.componentStack = [];
    }
    
    /**
     * Set the current active component
     * @param {Object} component - The component instance
     */
    setCurrentComponent(component) {
        console.log('Setting current component:', component.constructor.name);
        
        // Unmount previous component if it exists and has an unmount method
        if (this.currentComponent && typeof this.currentComponent.unmount === 'function') {
            console.log('Unmounting previous component:', this.currentComponent.constructor.name);
            this.currentComponent.unmount();
        }
        
        // Set new current component
        this.currentComponent = component;
        
        // Add to stack for history management
        this.componentStack.push(component);
        
        // Trim stack if it gets too large
        if (this.componentStack.length > 10) {
            this.componentStack.shift();
        }
    }
    
    /**
     * Handle back navigation
     * @returns {boolean} - True if handled, false otherwise
     */
    handleBack() {
        // Remove current component from stack
        if (this.componentStack.length > 0) {
            this.componentStack.pop();
        }
        
        // Get previous component
        const previousComponent = this.componentStack[this.componentStack.length - 1];
        
        // If we have a previous component, set it as current
        if (previousComponent) {
            this.currentComponent = previousComponent;
            return true;
        }
        
        return false;
    }
    
    /**
     * Clean up all components
     */
    cleanUp() {
        // Unmount current component
        if (this.currentComponent && typeof this.currentComponent.unmount === 'function') {
            this.currentComponent.unmount();
        }
        
        // Clear stack
        this.componentStack = [];
        this.currentComponent = null;
    }
}

// Create singleton instance
const navigationHelper = new NavigationHelper();

export default navigationHelper;