/**
 * LSPUriUtils - Centralized URI handling for LSP operations
 * 
 * This utility class handles all URI conversions between:
 * - File system paths
 * - Monaco editor URIs
 * - LSP server URIs
 * - Workspace-relative paths
 */
export class LSPUriUtils {
    constructor(workspaceRoot = null) {
        this.workspaceRoot = workspaceRoot;
        this.workspacePrefix = '/workspace/';
    }

    /**
     * Convert a file path to a Monaco URI for editor models
     * This creates URIs that the LSP server can properly normalize
     */
    createMonacoUri(filePath, isOriginal = false) {
        if (!filePath || filePath.trim() === '') {
            console.log('LSPUriUtils: No file path provided, using default URI');
            const suffix = isOriginal ? 'original' : 'modified';
            return window.monaco.Uri.parse(`inmemory://model/${suffix}`);
        }

        console.log(`LSPUriUtils: Creating Monaco URI for file path: ${filePath}`);
        
        // For external files (absolute paths), create URI directly
        if (filePath.startsWith('/')) {
            const suffix = isOriginal ? '.orig' : '';
            const uri = window.monaco.Uri.file(filePath + suffix);
            console.log(`LSPUriUtils: Created Monaco URI for external file: ${uri.toString()}`);
            return uri;
        }
        
        // For workspace files, create workspace-relative URI
        const workspacePath = this.workspacePrefix + filePath;
        const suffix = isOriginal ? '.orig' : '';
        const finalPath = workspacePath + suffix;
        
        const uri = window.monaco.Uri.file(finalPath);
        console.log(`LSPUriUtils: Created Monaco URI: ${uri.toString()}`);
        
        return uri;
    }

    /**
     * Convert a Monaco URI to a workspace-relative file path
     * Used for navigation and file operations
     */
    convertUriToWorkspacePath(uri) {
        try {
            console.log(`LSPUriUtils: Converting URI to workspace path: ${uri}`);
            
            if (uri && uri.startsWith('file://')) {
                const filePath = uri.substring('file://'.length);
                console.log(`LSPUriUtils: Extracted file path: ${filePath}`);
                
                // Handle workspace prefix URIs (from Monaco editor)
                if (filePath.startsWith(this.workspacePrefix)) {
                    const relativePath = filePath.substring(this.workspacePrefix.length);
                    // Remove .orig suffix if present
                    const cleanPath = relativePath.endsWith('.orig') ? 
                        relativePath.slice(0, -5) : relativePath;
                    console.log(`LSPUriUtils: Found workspace prefix, extracted relative path: ${cleanPath}`);
                    return cleanPath;
                }
                
                // Check if this is actually within the workspace root
                if (this.workspaceRoot && filePath.startsWith(this.workspaceRoot + '/')) {
                    const relativePath = filePath.substring(this.workspaceRoot.length + 1);
                    // Remove .orig suffix if present
                    const cleanPath = relativePath.endsWith('.orig') ? 
                        relativePath.slice(0, -5) : relativePath;
                    console.log(`LSPUriUtils: File is within workspace root, converted to relative path: ${cleanPath}`);
                    return cleanPath;
                }
                
                // For external files, return the full absolute path
                // Remove .orig suffix if present
                const cleanPath = filePath.endsWith('.orig') ? 
                    filePath.slice(0, -5) : filePath;
                console.log(`LSPUriUtils: External file detected, returning absolute path: ${cleanPath}`);
                return cleanPath;
            }
            
            console.log(`LSPUriUtils: Could not convert URI: ${uri}`);
            return null;
        } catch (error) {
            console.error('LSPUriUtils: Error converting URI to workspace path:', error);
            return null;
        }
    }

    /**
     * Normalize URI for LSP server communication
     * Handles both absolute and relative paths
     */
    normalizeUriForLSP(uri, workspaceRoot = null) {
        const root = workspaceRoot || this.workspaceRoot;
        console.log(`LSPUriUtils: Normalizing URI for LSP: ${uri}, workspace root: ${root}`);
        
        // Handle file:// URIs properly
        if (uri && uri.startsWith('file://')) {
            const filePath = uri.substring('file://'.length);
            
            // If it starts with /workspace/, convert to absolute path in workspace
            if (filePath.startsWith(this.workspacePrefix)) {
                const relativePath = filePath.substring(this.workspacePrefix.length);
                if (root) {
                    // Remove .orig suffix for LSP communication
                    const cleanPath = relativePath.endsWith('.orig') ? 
                        relativePath.slice(0, -5) : relativePath;
                    const path = require('path') || window.path;
                    if (path && path.resolve) {
                        const absolutePath = path.resolve(root, cleanPath);
                        const normalizedUri = `file://${absolutePath}`;
                        console.log(`LSPUriUtils: Converted workspace URI ${uri} to ${normalizedUri}`);
                        return normalizedUri;
                    }
                    // Fallback if path module not available
                    const absolutePath = `${root}/${cleanPath}`;
                    const normalizedUri = `file://${absolutePath}`;
                    console.log(`LSPUriUtils: Converted workspace URI ${uri} to ${normalizedUri} (fallback)`);
                    return normalizedUri;
                }
            }
            
            // If it's already an absolute path, keep it as is
            if (this.isAbsolutePath(filePath)) {
                console.log(`LSPUriUtils: URI is already absolute: ${uri}`);
                return uri;
            }
            
            // If it's a relative path, make it absolute relative to workspace
            if (root) {
                const path = require('path') || window.path;
                if (path && path.resolve) {
                    const absolutePath = path.resolve(root, filePath);
                    const normalizedUri = `file://${absolutePath}`;
                    console.log(`LSPUriUtils: Converted relative URI ${uri} to ${normalizedUri}`);
                    return normalizedUri;
                }
                // Fallback if path module not available
                const normalizedUri = `file://${root}/${filePath}`;
                console.log(`LSPUriUtils: Converted relative URI ${uri} to ${normalizedUri} (fallback)`);
                return normalizedUri;
            }
        }
        
        console.log(`LSPUriUtils: URI unchanged: ${uri}`);
        return uri;
    }

    /**
     * Check if a path is absolute
     * Works in both Node.js and browser environments
     */
    isAbsolutePath(filePath) {
        // Unix/Linux absolute path
        if (filePath.startsWith('/')) {
            return true;
        }
        
        // Windows absolute path (C:\ or C:/)
        if (/^[A-Za-z]:[\\\/]/.test(filePath)) {
            return true;
        }
        
        return false;
    }

    /**
     * Create a unique URI to avoid conflicts
     * Used as fallback when normal URI creation fails
     */
    createUniqueUri(prefix = 'inmemory://model/', suffix = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const uniqueId = `${timestamp}-${random}`;
        return window.monaco.Uri.parse(`${prefix}${uniqueId}${suffix}`);
    }

    /**
     * Extract filename from a file path or URI
     */
    getFilename(pathOrUri) {
        let path = pathOrUri;
        
        // Handle URI
        if (path.startsWith('file://')) {
            path = path.substring('file://'.length);
        }
        
        // Extract filename
        const parts = path.split('/');
        return parts[parts.length - 1] || path;
    }

    /**
     * Get the directory part of a file path or URI
     */
    getDirectory(pathOrUri) {
        let path = pathOrUri;
        
        // Handle URI
        if (path.startsWith('file://')) {
            path = path.substring('file://'.length);
        }
        
        // Extract directory
        const parts = path.split('/');
        if (parts.length > 1) {
            return parts.slice(0, -1).join('/') + '/';
        }
        
        return '';
    }

    /**
     * Check if two URIs refer to the same file
     */
    urisEqual(uri1, uri2) {
        if (!uri1 || !uri2) return false;
        
        // Normalize both URIs
        const normalized1 = this.normalizeUriForLSP(uri1);
        const normalized2 = this.normalizeUriForLSP(uri2);
        
        return normalized1 === normalized2;
    }

    /**
     * Set the workspace root for URI normalization
     */
    setWorkspaceRoot(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        console.log(`LSPUriUtils: Workspace root set to: ${workspaceRoot}`);
    }

    /**
     * Check if a file path represents an external file (outside workspace)
     */
    isExternalFile(filePath) {
        if (!filePath || !this.workspaceRoot) {
            return false;
        }

        // If it's an absolute path that doesn't start with workspace root, it's external
        if (filePath.startsWith('/') && !filePath.startsWith(this.workspaceRoot + '/')) {
            return true;
        }

        return false;
    }
}

// Create a singleton instance for global use
export const lspUriUtils = new LSPUriUtils();
