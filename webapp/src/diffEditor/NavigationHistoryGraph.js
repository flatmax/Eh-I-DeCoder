import { LitElement, html, css } from 'lit';
import * as d3 from 'd3';
import { navigationHistory } from './NavigationHistory.js';
import { EventHelper } from '../utils/EventHelper.js';

export class NavigationHistoryGraph extends LitElement {
  static properties = {
    currentFile: { type: String },
    currentTrackId: { type: Number },
    trackCount: { type: Number }
  };

  constructor() {
    super();
    this.currentFile = null;
    this.currentTrackId = 0;
    this.trackCount = 1;
    this.svg = null;
    this.colorScale = null;
    this.lastHistoryState = null;
  }

  static styles = css`
    :host {
      display: block;
      background: transparent;
      overflow: hidden;
      height: 100%;
    }

    .graph-container {
      flex: 0 0 auto;
      position: relative;
      width: 100%;
      height: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      /* Reserve space for scrollbar to prevent content jumping */
      scrollbar-gutter: stable;
    }

    .graph-container::-webkit-scrollbar {
      height: 6px;
    }

    .graph-container::-webkit-scrollbar-track {
      background: #1e1e1e;
    }

    .graph-container::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 3px;
    }

    .graph-container::-webkit-scroll-thumb:hover {
      background: #4f4f4f;
    }

    svg {
      display: block;
      min-width: 100%;
      /* Account for scrollbar height */
      height: calc(100% - 6px);
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
      font-size: 10px;
      fill: #cccccc;
      pointer-events: none;
      text-anchor: middle;
    }

    .track-indicator {
      cursor: pointer;
      transition: all 0.2s;
    }

    .track-indicator:hover {
      filter: brightness(1.5);
    }

    .track-indicator.current {
      fill: #007acc;
    }

    .track-indicator.inactive {
      fill: #666;
    }

    .track-indicator.empty {
      fill: #3e3e42;
      stroke: #666;
      stroke-width: 1px;
    }

    .track-label {
      font-size: 11px;
      fill: #969696;
      text-anchor: middle;
      pointer-events: none;
    }

    .track-label.current {
      fill: #007acc;
      font-weight: bold;
    }

    .tooltip {
      position: absolute;
      padding: 6px 8px;
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 3px;
      color: #cccccc;
      font-size: 11px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      max-width: 250px;
    }

    .tooltip.visible {
      opacity: 1;
    }

    .tooltip .file-path {
      font-weight: bold;
      margin-bottom: 3px;
      color: #4ec9b0;
    }

    .tooltip .position {
      font-size: 10px;
      color: #969696;
    }

    .tooltip .track-info {
      font-size: 10px;
      color: #969696;
      margin-top: 3px;
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

  render() {
    return html`
      <div class="graph-container">
        <svg></svg>
      </div>
      <div class="tooltip"></div>
    `;
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
    this.currentTrackId = event.detail?.currentTrackId || 0;
    this.trackCount = event.detail?.trackCount || 1;
    this.updateGraph();
  }

  updateGraph() {
    if (!this.svg) return;

    const allTracks = navigationHistory.getAllTracks();
    if (allTracks.length === 0) {
      // Clear the graph when there's no history
      this.svg.selectAll('*').remove();
      return;
    }

    // Check if history has actually changed
    const historyState = JSON.stringify(allTracks);
    if (historyState === this.lastHistoryState) return;
    this.lastHistoryState = historyState;

    const container = this.shadowRoot.querySelector('.graph-container');
    const containerWidth = container.clientWidth;
    const nodeRadius = 4;
    const nodeSpacing = 40;
    const trackIndicatorSize = 8;
    const trackIndicatorSpacing = 20;
    const labelOffset = 12;
    const margin = { top: 20, right: 15, bottom: 20, left: 15 };
    
    // Calculate dimensions
    const scrollbarHeight = 6;
    const containerHeight = container.clientHeight || 60;
    
    // Only show current track nodes
    const currentTrack = allTracks.find(t => t.isCurrentTrack);
    if (!currentTrack) return;
    
    const nodes = currentTrack.nodes;
    const requiredWidth = Math.max(containerWidth, (nodes.length * nodeSpacing) + margin.left + margin.right + (allTracks.length * trackIndicatorSpacing) + 40);
    const totalHeight = containerHeight - scrollbarHeight;

    // Update SVG dimensions
    this.svg
      .attr('width', requiredWidth)
      .attr('height', totalHeight);

    // Clear previous content
    this.svg.selectAll('*').remove();

    // Create main group
    const g = this.svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw track indicators on the left
    const trackIndicatorY = totalHeight / 2 - margin.top;
    
    allTracks.forEach((track, index) => {
      const indicatorX = index * trackIndicatorSpacing;
      
      // Track indicator circle
      g.append('circle')
        .attr('class', `track-indicator ${track.isCurrentTrack ? 'current' : 'inactive'} ${track.nodes.length === 0 ? 'empty' : ''}`)
        .attr('cx', indicatorX)
        .attr('cy', trackIndicatorY)
        .attr('r', trackIndicatorSize)
        .on('click', () => this.switchToTrack(track.trackId))
        .on('mouseenter', (event) => this.showTrackTooltip(event, track))
        .on('mouseleave', () => this.hideTooltip());
      
      // Track label
      g.append('text')
        .attr('class', `track-label ${track.isCurrentTrack ? 'current' : ''}`)
        .attr('x', indicatorX)
        .attr('y', trackIndicatorY + trackIndicatorSize + 10)
        .text(`T${track.trackId}`);
    });

    // Offset for the main graph content
    const graphOffset = (allTracks.length * trackIndicatorSpacing) + 30;

    // Prepare node data with positions for current track only
    const nodeData = nodes.map((entry, i) => ({
      ...entry,
      x: graphOffset + (i * nodeSpacing),
      y: trackIndicatorY,
      trackId: currentTrack.trackId,
      directory: this.getDirectory(entry.filePath),
      filename: this.getFilename(entry.filePath),
      labelAbove: i % 2 === 0  // Alternate label position
    }));

    // Create links between consecutive nodes
    const links = [];
    for (let i = 0; i < nodeData.length - 1; i++) {
      links.push({
        source: nodeData[i],
        target: nodeData[i + 1],
        active: nodeData[i].isCurrent || nodeData[i + 1].isCurrent
      });
    }

    // Draw links
    g.selectAll('.link')
      .data(links)
      .enter().append('line')
      .attr('class', d => `link ${d.active ? 'active' : ''}`)
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    // Draw nodes
    const nodeGroups = g.selectAll('.node-group')
      .data(nodeData)
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

    // Add labels
    nodeGroups.append('text')
      .attr('class', 'node-label')
      .attr('y', d => d.labelAbove ? -labelOffset : labelOffset + nodeRadius)
      .attr('dy', d => d.labelAbove ? '0' : '0.35em')
      .text(d => d.filename);

    // Scroll to current node if needed
    const currentNode = nodeData.find(n => n.isCurrent);
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

  switchToTrack(trackId) {
    // Switch to the target track
    while (navigationHistory.currentTrackId !== trackId) {
      if (navigationHistory.currentTrackId < trackId) {
        navigationHistory.switchToNextTrack();
      } else {
        navigationHistory.switchToPreviousTrack();
      }
    }
    
    // Navigate to current file in the track if it exists
    const track = navigationHistory.getCurrentTrack();
    if (track && track.current) {
      EventHelper.dispatchNavigateToHistory(this, track.current.filePath, track.current.line, track.current.character);
    }
  }

  handleNodeClick(node) {
    // Navigate to the file/position
    EventHelper.dispatchNavigateToHistory(this, node.filePath, node.line, node.character);
  }

  showTrackTooltip(event, track) {
    const tooltip = this.tooltip;
    const rect = event.target.getBoundingClientRect();
    const containerRect = this.shadowRoot.querySelector('.graph-container').getBoundingClientRect();
    
    const fileCount = track.nodes.length;
    const currentFile = track.nodes.find(n => n.isCurrent)?.filePath || 'None';
    
    tooltip.html(`
      <div class="track-info">Track ${track.trackId}${track.isCurrentTrack ? ' (current)' : ''}</div>
      <div class="position">${fileCount} file${fileCount !== 1 ? 's' : ''}</div>
      ${fileCount > 0 ? `<div class="file-path">Current: ${this.getFilename(currentFile)}</div>` : ''}
    `);
    
    tooltip
      .style('left', `${rect.left - containerRect.left + rect.width / 2}px`)
      .style('top', `${rect.bottom - containerRect.top + 5}px`)
      .classed('visible', true);
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
