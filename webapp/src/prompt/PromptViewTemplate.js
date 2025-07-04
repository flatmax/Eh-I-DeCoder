/**
 * Template rendering for PromptView component
 */
import { html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import '../../chat-history-panel.js';

export function renderPromptView(component) {
  return html`
    <div class="dialog-container" @click=${component.handleDialogClick}>
      <!-- Only right resize handle -->
      <div class="resize-handle resize-handle-right" 
        @mousedown=${(e) => component.handleResizeStart(e, 'right')}></div>
      
      <div class="dialog-header">
        <div class="header-top"
          @mousedown=${component.handleDragStart}
          @click=${component.handleHeaderClick}>
          <div class="tab-navigation">
            <button 
              class="tab-button ${component.activeTab === 'assistant' ? 'active' : ''}"
              @click=${(e) => component.handleTabClick(e, 'assistant')}
            >
              AI Assistant
            </button>
            <button 
              class="tab-button ${component.activeTab === 'history' ? 'active' : ''}"
              @click=${(e) => component.handleTabClick(e, 'history')}
            >
              Chat History
            </button>
          </div>
          <button 
            class="mode-toggle"
            @click=${component.handleModeToggle} 
            title="Toggle between File Explorer and Git History modes (Ctrl+G)"
          >
            ${component.gitHistoryMode ? '📁 File Mode' : '📊 History Mode'}
          </button>
        </div>
      </div>
      
      <div class="tab-content">
        <!-- AI Assistant Tab -->
        <div class="tab-panel ${component.activeTab === 'assistant' ? 'active' : ''}">
          <div class="prompt-container">
            <div class="message-history-wrapper">
              <div class="message-history" id="messageHistory" @scroll=${component.scrollManager.handleScroll.bind(component.scrollManager)}>
                ${repeat(
                  component.messageHistory,
                  (message, i) => i,
                  message => {
                    if (message.role === 'user') {
                      return html`<user-card .content=${message.content}></user-card>`;
                    } else if (message.role === 'assistant') {
                      return html`<assistant-card .content=${message.content}></assistant-card>`;
                    } else if (message.role === 'command') {
                      return html`<commands-card .content=${message.content}></commands-card>`;
                    }
                  }
                )}
              </div>
              ${component.showScrollToBottom ? html`
                <md-icon-button 
                  class="scroll-to-bottom-btn"
                  @click=${component.scrollManager.scrollToBottom.bind(component.scrollManager)}
                  title="Scroll to bottom"
                >
                  <md-icon>keyboard_arrow_down</md-icon>
                </md-icon-button>
              ` : ''}
            </div>
            <div class="input-area">
              <md-filled-text-field
                id="promptInput"
                type="textarea" 
                label="Enter your prompt"
                rows="${component.isMinimized ? '1' : '2'}"
                .value=${component.inputValue}
                @input=${e => component.inputValue = e.target.value}
                @keydown=${component.eventHandler.handleKeyDown.bind(component.eventHandler)}
                ?disabled=${component.isProcessing}
                style="width: 100%;"
              ></md-filled-text-field>
              <div class="controls-column">
                <div class="button-row">
                  <md-filled-button 
                    id="sendButton" 
                    @click=${component.eventHandler.sendPromptUI.bind(component.eventHandler)}
                    ?disabled=${component.isProcessing}
                  >
                    ${component.isProcessing ? 'Processing...' : component.coderType}
                  </md-filled-button>
                  
                  ${component.isProcessing ? html`
                    <md-icon-button 
                      id="stopButton" 
                      @click=${component.stopRunning}
                      style="background-color: #d32f2f; color: white;"
                    >
                      <md-icon>stop</md-icon>
                    </md-icon-button>
                  ` : ''}
                </div>
                
                <div class="voice-input-container">
                  ${component.showVoiceInput ? html`
                    <speech-to-text
                      @transcript=${component.eventHandler.handleTranscript.bind(component.eventHandler)}
                      @recording-started=${component.eventHandler.handleRecordingStarted.bind(component.eventHandler)}
                      @recognition-error=${component.eventHandler.handleRecognitionError.bind(component.eventHandler)}
                    ></speech-to-text>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Chat History Tab -->
        <div class="tab-panel ${component.activeTab === 'history' ? 'active' : ''}">
          <chat-history-panel 
            .serverURI=${component.serverURI}
            id="chatHistoryPanel"
          ></chat-history-panel>
        </div>
      </div>
    </div>
  `;
}
