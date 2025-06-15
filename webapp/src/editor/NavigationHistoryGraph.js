import { LitElement, html, css } from 'lit';
import * as d3 from 'd3';
import { navigationHistory } from './NavigationHistory.js';

export class NavigationHistoryGraph extends LitElement {
  static properties = {
    expanded: { type: Boolean, state: true },
    currentFile: { type: String }
  };

  constructor() {
    super();
    this.expanded = false;
    this.currentFile = null;
    this.svg = null;
    this.colorScale = null;
    this.lastHistoryState = null;
  }

  static styles = css`
    :host {
      display: block;
      background: #252526;
      border-bottom: 1px solid #3e3e42;
      transition: height 0.3s ease;
      overflow: hidden;
    }

    .graph-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .graph-container::-webkit-scrollbar {
      height: 8px;
    }

    .graph-container::-webkit-scrollbar-track {
      background: #1e1e1e;
    }

    .graph-container::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 4px;
    }

    .graph-container::-webkit-scrollbar-thumb:hover {
      background: #4f4f4f;
    }

    .expand-toggle {
      position: absolute;
      top: 4px;
      right: 8px;
      background: #3e3e42;
      border: none;
      color: #cccccc;
      padding: 2px 8px;
      cursor: pointer;
      border-radius: 3px;
      font-size: 11px;
      z-index: 10;
      transition: background 0.2s;
    }

    .expand-toggle:hover {
      background: #4f4f4f;
    }

    svg {
      display: block;
      min-width: 100%;
    }

    /* D3 element styles */
    .node {
      cursor: pointer;
      transition: all 0.2s;
    }

    .node:hover {
      filter: brightness(1.2);
    }

    .node.current {
      stroke: #007acc;
      stroke-width: 3px;
    }

    .node.has-changes {
      stroke: #ffa500;
      stroke-width: 2px;
      stroke-dasharray: 3,3;
    }

    .link {
      fill: none;
      stroke: #666;
      stroke-width: 1.5px;
      opacity: 0.6;
    }

    .link.active {
      stroke: #007acc;
      stroke-width: 2px;
      opacity: 1;
    }

    .node-label {
      font-size: 11px;
      fill: #cccccc;
      pointer-events: none;
      text-anchor: middle;
    }

    .tooltip {
      position: absolute;
      padding: 8px;
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      color: #cccccc;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      max-width: 300px;
    }

    .tooltip.visible {
      opacity: 1;
    }

    .tooltip .file-path {
      font-weight: bold;
      margin-bottom: 4px;
      color: #4ec9b0;
    }

    .tooltip .position {
      font-size: 11px;
      color: #969696;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Listen for navigation events
    this.handleNavigationUpdate = this.handleNavigationUpdate.bind(this);
    window.addEventListener('navigation-history-updated', this.handleNavigationUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('navigation-history-updated', this.handleNavigationUpdate);
  }

  firstUpdated() {
    this.initializeGraph();
  }

  updated(changedProperties) {
    if (changedProperties.has('expanded')) {
      // Redraw graph when expanded state changes
      setTimeout(() => this.updateGraph(), 300);
    }
  }

  render() {
    const height = this.expanded ? '120px' : '40px';
    
    return html`
      <div style="height: ${height}">
        <button class="expand-toggle" @click=${this.toggleExpanded}>
          ${this.expanded ? 'Collapse' : 'Expand'}
        </button>
        <div class="graph-container">
          <svg></svg>
        </div>
        <div class="tooltip"></div>
      </div>
    `;
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  initializeGraph() {
    const container = this.shadowRoot.querySelector('.graph-container');
    const svg = d3.select(this.shadowRoot.querySelector('svg'));
    
    this.svg = svg;
    this.tooltip = d3.select(this.shadowRoot.querySelector('.tooltip'));
    
    // Initialize color scale for directories
    this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
    this.updateGraph();
  }

  handleNavigationUpdate(event) {
    // Update graph when navigation history changes
    this.currentFile = event.detail?.currentFile;
    this.updateGraph();
  }

  updateGraph() {
    if (!this.svg) return;

    const historyArray = navigationHistory.toArray();
    if (historyArray.length === 0) return;

    // Check if history has actually changed
    const historyState = JSON.stringify(historyArray);
    if (historyState === this.lastHistoryState) return;
    this.lastHistoryState = historyState;

    const container = this.shadowRoot.querySelector('.graph-container');
    const containerWidth = container.clientWidth;
    const height = this.expanded ? 120 : 40;
    const nodeRadius = this.expanded ? 8 : 6;
    const nodeSpacing = this.expanded ? 100 : 60;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Calculate required width
    const requiredWidth = Math.max(containerWidth, (historyArray.length * nodeSpacing) + margin.left + margin.right);

    // Update SVG dimensions
    this.svg
      .attr('width', requiredWidth)
      .attr('height', height);

    // Clear previous content
    this.svg.selectAll('*').remove();

    // Create main group
    const g = this.svg.append('g')
      .attr('transform', `translate(${margin.left},${height / 2})`);

    // Prepare node data with positions
    const nodes = historyArray.map((entry, i) => ({
      ...entry,
      x: i * nodeSpacing,
      y: 0,
      directory: this.getDirectory(entry.filePath),
      filename: this.getFilename(entry.filePath)
    }));

    // Create links between consecutive nodes
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        source: nodes[i],
        target: nodes[i + 1],
        active: nodes[i].isCurrent || nodes[i + 1].isCurrent
      });
    }

    // Draw links
    g.selectAll('.link')
      .data(links)
      .enter().append('path')
      .attr('class', d => `link ${d.active ? 'active' : ''}`)
      .attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

    // Draw nodes
    const nodeGroups = g.selectAll('.node-group')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeGroups.append('circle')
      .attr('class', d => `node ${d.isCurrent ? 'current' : ''} ${d.hasChanges ? 'has-changes' : ''}`)
      .attr('r', nodeRadius)
      .attr('fill', d => this.colorScale(d.directory))
      .on('click', (event, d) => this.handleNodeClick(d))
      .on('mouseenter', (event, d) => this.showTooltip(event, d))
      .on('mouseleave', () => this.hideTooltip());

    // Add labels if expanded
    if (this.expanded) {
      nodeGroups.append('text')
        .attr('class', 'node-label')
        .attr('y', nodeRadius + 15)
        .text(d => this.truncateFilename(d.filename, 15));
    }

    // Scroll to current node if needed
    const currentNode = nodes.find(n => n.isCurrent);
    if (currentNode) {
      const scrollLeft = currentNode.x - (containerWidth / 2) + margin.left;
      container.scrollLeft = Math.max(0, scrollLeft);
    }
  }

  getDirectory(filePath) {
    const parts = filePath.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
  }

  getFilename(filePath) {
    return filePath.split('/').pop();
  }

  truncateFilename(filename, maxLength) {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength - 3) + '...';
  }

  handleNodeClick(node) {
    // Dispatch event to navigate to this file/position
    this.dispatchEvent(new CustomEvent('navigate-to-history', {
      detail: {
        filePath: node.filePath,
        line: node.line,
        character: node.character
      },
      bubbles: true,
      composed: true
    }));
  }

  showTooltip(event, node) {
    const tooltip = this.tooltip;
    const rect = event.target.getBoundingClientRect();
    const containerRect = this.shadowRoot.querySelector('.graph-container').getBoundingClientRect();
    
    tooltip.html(`
      <div class="file-path">${node.filePath}</div>
      <div class="position">Line ${node.line}, Column ${node.character}</div>
    `);
    
    tooltip
      .style('left', `${rect.left - containerRect.left + rect.width / 2}px`)
      .style('top', `${rect.bottom - containerRect.top + 5}px`)
      .classed('visible', true);
  }

  hideTooltip() {
    this.tooltip.classed('visible', false);
  }
}

customElements.define('navigation-history-graph', NavigationHistoryGraph);
