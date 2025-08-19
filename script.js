class MinimalChecklist {
  constructor() {
    this.tasks = []
    this.graveyard = []
    this.taskIdCounter = 1
    this.subtaskIdCounter = 1

    this.initializeElements()
    this.loadTasks()
    this.loadGraveyard()
    this.bindEvents()
    this.initializeDarkMode()
    this.scheduleMidnightReset()
    this.startTimeUpdates()
    this.updateCountdown() // Initialize countdown immediately
  }

  initializeElements() {
    this.addTaskInput = document.getElementById("addTaskInput")
    this.addTaskBtn = document.getElementById("addTaskBtn")
    this.taskList = document.getElementById("taskList")
    this.emptyState = document.getElementById("emptyState")
    this.darkModeToggle = document.getElementById("darkModeToggle")
    this.graveyardContainer = document.getElementById("graveyardContainer")
    this.graveyardList = document.getElementById("graveyardList")
    this.graveyardCount = document.getElementById("graveyardCount")
    this.emptyGraveyard = document.getElementById("emptyGraveyard")
  }

  bindEvents() {
    this.addTaskBtn.addEventListener("click", () => this.addTask())
    this.addTaskInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addTask()
    })
    this.darkModeToggle.addEventListener("click", () => this.toggleDarkMode())
    
    // Delete confirmation popup events
    const deletePopupClose = document.getElementById('deletePopupClose')
    const deletePopupOverlay = document.getElementById('deletePopupOverlay')
    
    if (deletePopupClose) {
      deletePopupClose.addEventListener('click', () => this.hideDeleteConfirmation())
    }
    
    if (deletePopupOverlay) {
      deletePopupOverlay.addEventListener('click', (e) => {
        if (e.target === deletePopupOverlay) {
          this.hideDeleteConfirmation()
        }
      })
    }
    
    // Delete popup action button
    const deletePopupConfirm = document.getElementById('deletePopupConfirm')
    
    if (deletePopupConfirm) {
      deletePopupConfirm.addEventListener('click', () => this.confirmDelete())
    }

    // Graveyard toggle button (mobile only)
    const graveyardToggleBtn = document.getElementById('graveyardToggleBtn')
    if (graveyardToggleBtn) {
      graveyardToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleGraveyard() })
    }

    // Collapse/expand when tapping the entire header (mobile only)
    const graveyardHeader = document.querySelector('.graveyard-header')
    if (graveyardHeader) {
      graveyardHeader.addEventListener('click', () => {
        if (window.innerWidth <= 768) this.toggleGraveyard()
      })
    }
  }

  initializeDarkMode() {
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)
    this.updateDarkModeIcon(savedTheme)
  }

  toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute("data-theme")
    const newTheme = currentTheme === "dark" ? "light" : "dark"

    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    this.updateDarkModeIcon(newTheme)
  }

  updateDarkModeIcon(theme) {
    const icon = this.darkModeToggle.querySelector(".icon-svg use")
    icon.setAttribute("href", theme === "dark" ? "#icon-sun" : "#icon-moon")
  }

  scheduleMidnightReset() {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    setTimeout(() => {
      this.resetGraveyard()
      // Schedule for next day
      setInterval(() => this.resetGraveyard(), 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }

  startTimeUpdates() {
    // Update graveyard times every minute
    setInterval(() => {
      this.updateGraveyardTimes()
    }, 60000) // 60 seconds
    
    // Update countdown every second
    setInterval(() => {
      this.updateCountdown()
    }, 1000) // 1 second
  }

  resetGraveyard() {
    this.graveyard = []
    this.saveGraveyard()
    this.renderGraveyard()
    console.log("[v0] Daily reset: Graveyard cleared at midnight")
  }

  clearGraveyardAtMidnight() {
    if (this.graveyard.length > 0) {
      this.graveyard = []
      this.saveGraveyard()
      this.renderGraveyard()
      console.log("[v0] Midnight countdown: Graveyard automatically cleared")
    }
  }

  addTask() {
    const title = this.addTaskInput.value.trim()
    if (!title) return

    const task = {
      id: this.taskIdCounter++,
      title,
      completed: false,
      important: false,
      expanded: false,
      icon: this.getTaskInitials(title),
      notes: "",
      subtasks: [],
      createdAt: Date.now(),
    }

    this.tasks.unshift(task) // Add to beginning (newest first)
    this.addTaskInput.value = ""
    this.saveTasks()
    this.renderTasks()
  }

  getTaskInitials(title) {
    const words = title.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase()
    } else if (words[0].length === 1) {
      return words[0].toUpperCase()
    }
    return "TS" // fallback for empty titles
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter((task) => task.id !== taskId)
    this.saveTasks()
    this.renderTasks()
  }

  toggleTaskComplete(taskId) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      task.completed = !task.completed
      
      if (task.completed) {
        // Move to graveyard and remove from active tasks
        this.moveToGraveyard(task)
        this.tasks = this.tasks.filter((t) => t.id !== taskId)
      } else {
        // Remove from graveyard
        this.removeFromGraveyard(taskId)
      }
      
      this.saveTasks()
      this.saveGraveyard()
      this.renderTasks()
      this.renderGraveyard()
    }
  }

  moveToGraveyard(task) {
    const graveyardTask = {
      ...task,
      movedToGraveyardAt: Date.now()
    }
    this.graveyard.unshift(graveyardTask)
  }

  removeFromGraveyard(taskId) {
    this.graveyard = this.graveyard.filter((task) => task.id !== taskId)
  }

  restoreFromGraveyard(taskId) {
    const graveyardTask = this.graveyard.find((t) => t.id === taskId)
    if (graveyardTask) {
      // Remove from graveyard
      this.graveyard = this.graveyard.filter((t) => t.id !== taskId)
      
      // Add back to active tasks
      const restoredTask = { ...graveyardTask }
      delete restoredTask.movedToGraveyardAt
      restoredTask.completed = false
      
      this.tasks.unshift(restoredTask)
      
      this.saveTasks()
      this.saveGraveyard()
      this.renderTasks()
      this.renderGraveyard()
    }
  }

  deleteFromGraveyard(taskId) {
    this.graveyard = this.graveyard.filter((task) => task.id !== taskId)
    this.saveGraveyard()
    this.renderGraveyard()
  }

  showDeleteConfirmation(taskId) {
    this.pendingDeleteId = taskId
    this.pendingDeleteSource = 'graveyard'
    
    // Find the task to preview
    const task = this.graveyard.find(t => t.id === taskId)
    if (task) {
      // Update the preview
      const previewIcon = document.querySelector('#deleteTaskPreview .preview-icon')
      const previewTitle = document.querySelector('#deleteTaskPreview .preview-title')
      
      if (previewIcon) previewIcon.textContent = task.icon
      if (previewTitle) previewTitle.textContent = task.title
    }
    
    const overlay = document.getElementById('deletePopupOverlay')
    overlay.classList.add('show')
  }

  showDeleteConfirmationTask(taskId) {
    this.pendingDeleteId = taskId
    this.pendingDeleteSource = 'task'
    
    // Find the task to preview
    const task = this.tasks.find(t => t.id === taskId)
    if (task) {
      // Update the preview
      const previewIcon = document.querySelector('#deleteTaskPreview .preview-icon')
      const previewTitle = document.querySelector('#deleteTaskPreview .preview-title')
      
      if (previewIcon) previewIcon.textContent = task.icon
      if (previewTitle) previewTitle.textContent = task.title
    }
    
    const overlay = document.getElementById('deletePopupOverlay')
    overlay.classList.add('show')
  }

  hideDeleteConfirmation() {
    const overlay = document.getElementById('deletePopupOverlay')
    overlay.classList.remove('show')
    this.pendingDeleteId = null
    this.pendingDeleteSource = null
  }

  confirmDelete() {
    if (this.pendingDeleteId) {
      if (this.pendingDeleteSource === 'graveyard') {
        this.deleteFromGraveyard(this.pendingDeleteId)
      } else if (this.pendingDeleteSource === 'task') {
        this.deleteTask(this.pendingDeleteId)
      }
      this.hideDeleteConfirmation()
    }
  }

  toggleTaskImportant(taskId) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      task.important = !task.important
      this.saveTasks()
      this.renderTasks()
    }
  }

  toggleTaskExpanded(taskId) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      task.expanded = !task.expanded
      this.renderTasks()
    }
  }

  updateTaskTitle(taskId, newTitle) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      task.title = newTitle
      this.saveTasks()
    }
  }

  // Expand/collapse auto-resizing task title textarea
  expandTaskTitle(el) {
    // If content overflows single line, allow wrap and grow
    el.classList.add('expanded')
    // hide display span if present
    const display = el.previousElementSibling && el.previousElementSibling.classList.contains('task-title-display') ? el.previousElementSibling : null
    if (display) display.style.display = 'none'
    this.autoResizeTaskTitle(el)
  }

  autoResizeTaskTitle(el) {
    // Temporarily reset height to measure scrollHeight accurately
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    
    // If user typed something, clear any error state
    if (el.value.trim() !== '') {
      const taskDiv = el.closest('.task-item')
      if (taskDiv) {
        taskDiv.classList.remove('error')
        const error = taskDiv.querySelector('.task-error-message')
        if (error) error.remove()
      }
    }
  }

  collapseTaskTitle(taskId, el) {
    // Check if title is empty or just whitespace
    if (el.value.trim() === '') {
      // Show validation error instead of deleting
      const taskDiv = el.closest('.task-item')
      if (taskDiv) {
        taskDiv.classList.add('error', 'shake')
        let error = taskDiv.querySelector('.task-error-message')
        if (!error) {
          error = document.createElement('div')
          error.className = 'task-error-message'
          error.textContent = "This section can’t be left blank."
          const header = taskDiv.querySelector('.task-header')
          if (header) {
            header.insertAdjacentElement('afterend', error)
          } else {
            taskDiv.appendChild(error)
          }
        } else {
          error.style.display = 'block'
          error.textContent = "This section can’t be left blank."
        }
        // Keep the textarea visible and focused for correction
        el.classList.add('expanded')
        el.style.display = ''
        this.autoResizeTaskTitle(el)
        el.focus()
        // Hide display span while invalid
        const displaySpan = taskDiv.querySelector('.task-title-display')
        if (displaySpan) displaySpan.style.display = 'none'
        // Remove shake class after animation completes
        setTimeout(() => taskDiv.classList.remove('shake'), 600)
      }
      return
    }
    
    // Persist content
    this.updateTaskTitle(taskId, el.value)

    // Remove any existing error state on successful save
    const taskDiv = el.closest('.task-item')
    if (taskDiv) {
      taskDiv.classList.remove('error')
      const error = taskDiv.querySelector('.task-error-message')
      if (error) error.remove()
    }

    // Remove expanded state and shrink back to single line look if not needed
    el.classList.remove('expanded')
    // Reset height back to one line; CSS will clamp visuals
    el.style.height = ''
    // update display span and show it
    const display = el.previousElementSibling && el.previousElementSibling.classList.contains('task-title-display') ? el.previousElementSibling : null
    if (display) {
      display.textContent = el.value
      display.style.display = ''
    }
  }

  startEditingTitle(ev, taskId, displayEl) {
    if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation()
    const textarea = displayEl.nextElementSibling

    // Mobile-only: first tap expands, second tap edits
    const isMobile = window.innerWidth <= 768
    if (isMobile) {
      const taskDiv = displayEl.closest('.task-item')
      const isExpanded = taskDiv && taskDiv.querySelector('.task-details')?.classList.contains('expanded')
      if (!isExpanded) {
        // Just expand the task; do not enter edit mode yet
        const taskIdNum = Number(taskId)
        this.toggleTaskExpanded(taskIdNum)
        return
      }
      // If already expanded, proceed to edit
    }

    if (textarea && textarea.classList.contains('task-title')) {
      displayEl.style.display = 'none'
      textarea.classList.add('expanded')
      textarea.focus()
      this.autoResizeTaskTitle(textarea)
    }
  }

  updateTaskNotes(taskId, notes) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      task.notes = notes
      this.saveTasks()
    }
  }

  addSubtask(taskId, title) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task && title.trim()) {
      const subtask = {
        id: this.subtaskIdCounter++,
        title: title.trim(),
        completed: false,
      }
      task.subtasks.push(subtask)
      this.saveTasks()
      this.renderTasks()
    }
  }

  toggleSubtaskComplete(taskId, subtaskId) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      const subtask = task.subtasks.find((s) => s.id === subtaskId)
      if (subtask) {
        subtask.completed = !subtask.completed
        this.saveTasks()
        this.renderTasks()
      }
    }
  }

  deleteSubtask(taskId, subtaskId) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId)
      this.saveTasks()
      this.renderTasks()
    }
  }

  updateSubtaskTitle(taskId, subtaskId, newTitle) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (task) {
      const subtask = task.subtasks.find((s) => s.id === subtaskId)
      if (subtask) {
        subtask.title = newTitle
        this.saveTasks()
      }
    }
  }

  updateGraveyardTimes() {
    const graveyardItems = this.graveyardList.querySelectorAll('.graveyard-item')
    graveyardItems.forEach(item => {
      const taskId = Number.parseInt(item.dataset.taskId)
      const task = this.graveyard.find(t => t.id === taskId)
      if (task) {
        const timeElement = item.querySelector('.graveyard-task-time')
        if (timeElement) {
          timeElement.textContent = this.getTimeAgo(task.movedToGraveyardAt)
        }
        
        // Also update expiry warning if needed
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        
        const timeUntilMidnight = tomorrow.getTime() - now.getTime()
        const isExpiringSoon = timeUntilMidnight < 2 * 60 * 60 * 1000
        
        if (isExpiringSoon && !item.classList.contains('expiring-soon')) {
          item.classList.add('expiring-soon')
          const warningElement = item.querySelector('.expiring-warning')
          if (!warningElement) {
            const taskInfo = item.querySelector('.graveyard-task-info')
            if (taskInfo) {
              const warning = document.createElement('div')
              warning.className = 'expiring-warning'
              warning.textContent = 'will be removed soon'
              taskInfo.appendChild(warning)
            }
          }
        } else if (!isExpiringSoon && item.classList.contains('expiring-soon')) {
          item.classList.remove('expiring-soon')
          const warningElement = item.querySelector('.expiring-warning')
          if (warningElement) {
            warningElement.remove()
          }
        }
      }
    })
  }

  updateCountdown() {
    const countdownBadge = document.getElementById('countdownBadge')
    if (!countdownBadge) return
    
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime()
    
    if (timeUntilMidnight <= 0) {
      countdownBadge.textContent = '00:00:00'
      // Auto-clear graveyard when countdown reaches zero
      this.clearGraveyardAtMidnight()
      return
    }

    const hours = Math.floor(timeUntilMidnight / (1000 * 60 * 60))
    const minutes = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeUntilMidnight % (1000 * 60)) / 1000)
    
    countdownBadge.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  renderTasks() {
    const tasks = this.tasks;

    if (tasks.length === 0) {
      this.emptyState.style.display = "block";
      this.taskList.innerHTML = "";
      this.taskList.appendChild(this.emptyState);
      return;
    }

    this.emptyState.style.display = "none";
    this.taskList.innerHTML = "";

    // Group important tasks by selected color (no headers, just grouped order)
    const important = tasks.filter(t => t.important || t.importantColor);
    const normal = tasks.filter(t => !(t.important || t.importantColor));

    const colorOrder = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const groups = colorOrder.map(c => important.filter(t => (t.importantColor || '') === c));

    let appendedAny = false;
    const appendGroup = (arr) => {
      if (arr.length === 0) return;
      if (appendedAny) {
        const separator = document.createElement('div');
        separator.className = 'favorites-separator';
        this.taskList.appendChild(separator);
      }
      arr.forEach(task => {
        const el = this.createTaskElement(task);
        this.taskList.appendChild(el);
      });
      appendedAny = true;
    };

    // Append each colored important group with separators between
    groups.forEach(group => appendGroup(group));

    // Any important items without recognized color go next
    const uncategorizedImportant = important.filter(t => !colorOrder.includes(t.importantColor));
    appendGroup(uncategorizedImportant);

    // Then normal tasks (add separator if something already appended)
    appendGroup(normal);

    this.initializeDragAndDrop();
  }

  renderGraveyard() {
    this.graveyardCount.textContent = this.graveyard.length

    if (this.graveyard.length === 0) {
      this.emptyGraveyard.style.display = "block"
      this.graveyardList.innerHTML = ""
      this.graveyardList.appendChild(this.emptyGraveyard)
      return
    }

    this.emptyGraveyard.style.display = "none"
    this.graveyardList.innerHTML = ""

    this.graveyard.forEach((task) => {
      const graveyardElement = this.createGraveyardElement(task)
      this.graveyardList.appendChild(graveyardElement)
    })
  }

  createGraveyardElement(task) {
    const graveyardDiv = document.createElement("div")
    graveyardDiv.className = "graveyard-item"
    graveyardDiv.dataset.taskId = task.id

    const timeAgo = this.getTimeAgo(task.movedToGraveyardAt)
    
    // Calculate time until next midnight
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Set to midnight
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime()
    const isExpiringSoon = timeUntilMidnight < 2 * 60 * 60 * 1000;

    
    if (isExpiringSoon) {
      graveyardDiv.classList.add("expiring-soon")
    }

    graveyardDiv.innerHTML = `
      <div class="graveyard-task-content">
        <span class="graveyard-task-icon">${task.icon}</span>
        <div class="graveyard-task-info">
          <div class="graveyard-task-title">${task.title}</div>
          <div class="graveyard-task-time">${timeAgo}</div>
          ${isExpiringSoon ? '<div class="expiring-warning">will be removed soon</div>' : ''}
        </div>
      </div>
      <div class="graveyard-task-actions">
        <button class="graveyard-btn restore-btn" 
                onclick="app.restoreFromGraveyard(${task.id})" 
                title="Restore task">
          <svg class="icon-svg"><use href="#icon-restore"/></svg>
        </button>
        <button class="graveyard-btn delete-btn" 
                onclick="app.showDeleteConfirmation(${task.id})" 
                title="Delete permanently">
          <svg class="icon-svg"><use href="#icon-delete"/></svg>
        </button>
      </div>
    `

    return graveyardDiv
  }

  getTimeAgo(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  }

  createTaskElement(task) {
    const taskDiv = document.createElement("div")
    taskDiv.className = `task-item ${task.important ? "important" : ""}`
    taskDiv.draggable = true
    taskDiv.dataset.taskId = task.id
    
    // Add click event to expand task when clicked (not dragged)
    taskDiv.addEventListener("click", (e) => {
      // Don't expand/collapse if clicking on interactive elements or expanded content
      if (e.target.closest('.task-checkbox') || 
          e.target.closest('.task-actions') || 
          e.target.closest('.task-title') ||
          e.target.closest('.task-title-display') ||
          e.target.closest('.subtask-item') ||
          e.target.closest('.add-subtask-container') ||
          e.target.closest('.task-details') ||
          e.target.closest('.task-notes') ||
          e.target.closest('.subtasks')) {
        return;
      }
      this.toggleTaskExpanded(task.id);
    });

    taskDiv.innerHTML = `
            <div class="task-header">
                <button class="task-checkbox ${task.completed ? "completed" : ""}" 
                        onclick="app.toggleTaskComplete(${task.id})" aria-label="Complete task">
                  <span class="check-badge-icon" aria-hidden="true"></span>
                </button>
                <span class="task-icon">${task.icon}</span>
                <span class="task-title-display ${task.completed ? "completed" : ""}"
                      onclick="app.startEditingTitle(event, ${task.id}, this)">${task.title}</span>
                <textarea class="task-title ${task.completed ? "completed" : ""}"
                          rows="1"
                          onfocus="app.expandTaskTitle(this)"
                          oninput="app.autoResizeTaskTitle(this)"
                          onblur="app.collapseTaskTitle(${task.id}, this)"
                          onkeypress="if(event.key==='Enter'){ event.preventDefault(); this.blur(); }">${task.title}</textarea>
                <div class="task-actions">
                    <button class="task-btn important-btn ${task.important || task.importantColor ? "active" : ""}" 
                            onclick="app.openColorPopover(event, ${task.id})" 
                            title="Pin to top">
                        <svg class="icon-svg"><use href="#icon-star"/></svg>
                    </button>
                    <button class="task-btn expand-btn ${task.expanded ? "active" : ""}" 
                            onclick="app.toggleTaskExpanded(${task.id})" 
                            title="Expand">
                        <svg class="icon-svg">
                            <use href="${task.expanded ? '#icon-expand-down' : '#icon-expand-right'}"/>
                        </svg>
                    </button>
                    <button class="task-btn delete-btn" 
                            onclick="app.moveTaskToGraveyard(${task.id})" 
                            title="Send to graveyard">
                        <svg class="icon-svg"><use href="#icon-delete"/></svg>
                    </button>
                </div>
            </div>
            <div class="task-details ${task.expanded ? "expanded" : ""}">
                <div class="task-notes">
                    <label>Notes</label>
                    <textarea placeholder="Add notes..." 
                              onblur="app.updateTaskNotes(${task.id}, this.value)">${task.notes}</textarea>
                </div>
                <div class="subtasks">
                    <label>Subtasks</label>
                    <div class="subtask-list">
                        ${task.subtasks
                          .map(
                            (subtask) => `
                            <div class="subtask-item">
                                <div class="subtask-checkbox ${subtask.completed ? "completed" : ""}" 
                                     onclick="app.toggleSubtaskComplete(${task.id}, ${subtask.id})"></div>
                                <input type="text" class="subtask-title ${subtask.completed ? "completed" : ""}" 
                                       value="${subtask.title}"
                                       onblur="app.updateSubtaskTitle(${task.id}, ${subtask.id}, this.value)"
                                       onkeypress="if(event.key==='Enter') this.blur()">
                                <button class="subtask-delete" 
                                        onclick="app.deleteSubtask(${task.id}, ${subtask.id})">
                                    <svg class="icon-svg"><use href="#icon-close"/></svg>
                                </button>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                    <div class="add-subtask-container">
                        <input type="text" class="add-subtask-input" 
                               placeholder="Add subtask..." 
                               onkeypress="if(event.key==='Enter') { app.addSubtask(${task.id}, this.value); this.value=''; }">
                        <button class="add-subtask-btn" 
                                onclick="const input = this.previousElementSibling; app.addSubtask(${task.id}, input.value); input.value='';">Add</button>
                    </div>
                </div>
            </div>
        `

    // Apply favorite color styling if set
    if (task.importantColor) {
      const favColor = task.importantColor;
      // Gradient background and border-left
      taskDiv.style.borderLeft = `4px solid ${favColor}`;
      taskDiv.style.background = `linear-gradient(90deg, ${this.hexToRgba(favColor, 0.22)} 0%, transparent 45%)`;
      // Star icon color
      const starBtn = taskDiv.querySelector('.important-btn');
      if (starBtn) starBtn.style.color = favColor;
      // Task icon and checkbox
      const iconEl = taskDiv.querySelector('.task-icon');
      if (iconEl) iconEl.style.color = favColor;
      const checkIcon = taskDiv.querySelector('.check-badge-icon');
      if (checkIcon) checkIcon.style.color = favColor;
    } else if (task.important) {
      // Backward compatibility: important without color -> use success color
      taskDiv.style.borderLeft = '';
    }

    return taskDiv
  }

  // Soft-delete from task list: send to graveyard without confirmation
  moveTaskToGraveyard(taskId) {
    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return
    this.moveToGraveyard(task)
    this.tasks = this.tasks.filter(t => t.id !== taskId)
    this.saveTasks()
    this.saveGraveyard()
    this.renderTasks()
    this.renderGraveyard()
  }

  // Open color popover above the star button
  openColorPopover(ev, taskId) {
    ev.stopPropagation();
    this.closeColorPopover();
    const btn = ev.currentTarget;
    const rect = btn.getBoundingClientRect();
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const pop = document.createElement('div');
    pop.className = 'color-popover';
    pop.innerHTML = `
      <div class="color-popover-inner">
        ${colors.map(c => `<button class="color-option" data-color="${c}" style="background:${c}"></button>`).join('')}
      </div>
      <div class="color-popover-arrow"></div>
    `;
    document.body.appendChild(pop);
    const popRect = pop.getBoundingClientRect();
    const top = window.scrollY + rect.top - popRect.height - 10;
    const left = Math.min(
      Math.max(8, window.scrollX + rect.left + rect.width / 2 - popRect.width / 2),
      window.scrollX + document.documentElement.clientWidth - popRect.width - 8
    );
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.zIndex = '9999';
    this._activeColorPopover = pop;
    this._activeColorTaskId = taskId;

    pop.addEventListener('click', (e) => {
      const btnEl = e.target.closest('.color-option');
      if (btnEl) {
        const color = btnEl.getAttribute('data-color');
        this.setTaskImportantColor(this._activeColorTaskId, color);
        this.closeColorPopover();
      }
      e.stopPropagation();
    });

    // Close on outside click/scroll/resize
    const closeOnOutside = (e) => {
      if (!pop.contains(e.target)) {
        this.closeColorPopover();
        document.removeEventListener('click', closeOnOutside, true);
        window.removeEventListener('scroll', closeOnOutside, true);
        window.removeEventListener('resize', closeOnOutside, true);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeOnOutside, true);
      window.addEventListener('scroll', closeOnOutside, true);
      window.addEventListener('resize', closeOnOutside, true);
    }, 0);
  }

  closeColorPopover() {
    if (this._activeColorPopover && this._activeColorPopover.parentNode) {
      this._activeColorPopover.parentNode.removeChild(this._activeColorPopover);
    }
    this._activeColorPopover = null;
    this._activeColorTaskId = null;
  }

  setTaskImportantColor(taskId, color) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    // Toggle behavior: selecting the same color removes favorite status
    if (task.importantColor === color) {
      task.important = false;
      delete task.importantColor;
    } else {
      task.important = true;
      task.importantColor = color;
    }
    this.saveTasks();
    this.renderTasks();
  }

  hexToRgba(hex, alpha) {
    const h = hex.replace('#','');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  initializeDragAndDrop() {
    const taskItems = this.taskList.querySelectorAll(".task-item");
    let currentDropTarget = null;
    let dropPosition = 'below'; // 'above' or 'below'

    taskItems.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        console.log('Drag start on task:', item.dataset.taskId);
        e.dataTransfer.setData("text/plain", item.dataset.taskId);
        e.dataTransfer.effectAllowed = "move";
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        if (currentDropTarget) {
          currentDropTarget.classList.remove("drop-below", "drop-above");
          currentDropTarget = null;
        }
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        // Determine drop position based on mouse position
        const rect = item.getBoundingClientRect();
        const mouseY = e.clientY;
        const itemCenterY = rect.top + rect.height / 2;
        
        dropPosition = mouseY < itemCenterY ? 'above' : 'below';

        if (currentDropTarget && currentDropTarget !== item) {
          currentDropTarget.classList.remove("drop-below", "drop-above");
        }
        currentDropTarget = item;
        
        // Show appropriate drop indicator
        if (dropPosition === 'above') {
          currentDropTarget.classList.add("drop-above");
          currentDropTarget.classList.remove("drop-below");
        } else {
          currentDropTarget.classList.add("drop-below");
          currentDropTarget.classList.remove("drop-above");
        }
      });

      item.addEventListener("dragleave", () => {
        if (currentDropTarget === item) {
          item.classList.remove("drop-below", "drop-above");
          currentDropTarget = null;
        }
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        console.log('Drop event triggered');
        
        const draggedId = Number.parseInt(e.dataTransfer.getData("text/plain"));
        const targetId = Number.parseInt(item.dataset.taskId);
        
        console.log('Dragged ID:', draggedId, 'Target ID:', targetId, 'Position:', dropPosition);

        if (currentDropTarget) {
          currentDropTarget.classList.remove("drop-below", "drop-above");
          currentDropTarget = null;
        }

        if (!Number.isNaN(draggedId) && draggedId !== targetId) {
          if (dropPosition === 'above') {
            console.log('Calling reorderTasksInsertAbove');
            this.reorderTasksInsertAbove(draggedId, targetId);
          } else {
            console.log('Calling reorderTasksInsertBelow');
            this.reorderTasksInsertBelow(draggedId, targetId);
          }
        } else {
          console.log('Skipping reorder:', { draggedId, targetId, isNaN: Number.isNaN(draggedId), isSame: draggedId === targetId });
        }
      });
    });
  }

  reorderTasksInsertAbove(draggedId, targetId) {
    console.log('Reordering:', draggedId, 'above', targetId);
    
    const dragged = this.tasks.find(t => t.id === draggedId);
    const target = this.tasks.find(t => t.id === targetId);
    
    if (!dragged || !target) {
      console.log('Task not found:', { dragged, target });
      return;
    }

    // Enforce "same group" rule
    if (dragged.important !== target.important) {
      console.log('Different groups, cannot reorder');
      return;
    }

    // Remove dragged from tasks
    const fromIndex = this.tasks.indexOf(dragged);
    this.tasks.splice(fromIndex, 1);

    // Recompute target index after removal if needed
    let toIndex = this.tasks.indexOf(target);

    // Insert BEFORE target (i.e., directly above it)
    this.tasks.splice(toIndex, 0, dragged);

    console.log('Reordered successfully');
    this.saveTasks();
    this.renderTasks();
  }

  reorderTasksInsertBelow(draggedId, targetId) {
    console.log('Reordering:', draggedId, 'below', targetId);
    
    const dragged = this.tasks.find(t => t.id === draggedId);
    const target = this.tasks.find(t => t.id === targetId);
    
    if (!dragged || !target) {
      console.log('Task not found:', { dragged, target });
      return;
    }

    // Enforce "same group" rule
    if (dragged.important !== target.important) {
      console.log('Different groups, cannot reorder');
      return;
    }

    // Remove dragged from tasks
    const fromIndex = this.tasks.indexOf(dragged);
    this.tasks.splice(fromIndex, 1);

    // Recompute target index after removal if needed
    let toIndex = this.tasks.indexOf(target);

    // Insert AFTER target (i.e., directly below it)
    this.tasks.splice(toIndex + 1, 0, dragged);

    console.log('Reordered successfully');
    this.saveTasks();
    this.renderTasks();
  }

  saveTasks() {
    localStorage.setItem("minimal-checklist-tasks", JSON.stringify(this.tasks))
    localStorage.setItem(
      "minimal-checklist-counters",
      JSON.stringify({
        taskIdCounter: this.taskIdCounter,
        subtaskIdCounter: this.subtaskIdCounter,
      }),
    )
  }

  saveGraveyard() {
    localStorage.setItem("minimal-checklist-graveyard", JSON.stringify(this.graveyard))
  }

  loadTasks() {
    const savedTasks = localStorage.getItem("minimal-checklist-tasks")
    const savedCounters = localStorage.getItem("minimal-checklist-counters")

    if (savedTasks) {
      this.tasks = JSON.parse(savedTasks)
    }

    if (savedCounters) {
      const counters = JSON.parse(savedCounters)
      this.taskIdCounter = counters.taskIdCounter || 1
      this.subtaskIdCounter = counters.subtaskIdCounter || 1
    }

    this.renderTasks()
  }

  loadGraveyard() {
    const savedGraveyard = localStorage.getItem("minimal-checklist-graveyard")
    if (savedGraveyard) {
      this.graveyard = JSON.parse(savedGraveyard)
    }
    this.renderGraveyard()
  }

  toggleGraveyard() {
    const graveyardContainer = document.getElementById('graveyardContainer')
    const toggleBtn = document.getElementById('graveyardToggleBtn')
    
    if (graveyardContainer && toggleBtn) {
      const isCollapsed = graveyardContainer.classList.contains('collapsed')
      const useEl = toggleBtn.querySelector('.icon-svg use')
      
      if (isCollapsed) {
        // Expand
        graveyardContainer.classList.remove('collapsed')
        toggleBtn.classList.remove('collapsed')
        if (useEl) useEl.setAttribute('href', '#icon-expand-down')
        // Mobile: hide top bar when expanded
        if (window.innerWidth <= 768) {
          document.body.classList.add('hide-top-bar')
        }
      } else {
        // Collapse
        graveyardContainer.classList.add('collapsed')
        toggleBtn.classList.add('collapsed')
        if (useEl) useEl.setAttribute('href', '#icon-expand-right')
        // Mobile: show top bar when collapsed
        if (window.innerWidth <= 768) {
          document.body.classList.remove('hide-top-bar')
        }
      }
    }
  }
}

// Initialize the app
const app = new MinimalChecklist()

// Dynamic app title typing effect for the changing word
;(function() {
  const target = document.getElementById('dynamicWord')
  if (!target) return

  const WORDS = [
    // Friendly
    'Task Buddy',
    'Task Helper',
    'Task Assistant',
    'Daily Planner',
    'Daily Organizer',
    'Plan Pal',
    'Goal Keeper',
    'Workmate',
    'Task Genie',
    'Daily Companion',
    'Plan Helper',
  
    // Neutral
    'Task Manager',
    'Project Tracker',
    'Planning Tool',
    'Productivity Suite',
    'Task Framework',
    'Project Platform',
    'Planning System',
    'Management Kit',
  ];
  
  

  function shuffle(array) {
    const a = array.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = a[i]
      a[i] = a[j]
      a[j] = tmp
    }
    return a
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function jitter(min, max) {
    return Math.floor(min + Math.random() * (max - min))
  }

  async function typeWord(word) {
    for (let i = 0; i < word.length; i++) {
      target.textContent = target.textContent + word[i]
      await wait(jitter(120, 220))
      if (Math.random() < 0.12) await wait(jitter(150, 250))
    }
  }

  async function deleteWord() {
    while (target.textContent.length > 0) {
      target.textContent = target.textContent.slice(0, -1)
      await wait(jitter(80, 150))
      if (Math.random() < 0.1) await wait(jitter(100, 180))
    }
  }

  async function runLoop() {
    let pool = shuffle(WORDS)
    let index = 0
    // initial small delay for a natural start
    await wait(300)
    while (true) {
      const word = pool[index % pool.length]
      index++
      await typeWord(word)
      await wait(jitter(800, 1400))
      await deleteWord()
      await wait(jitter(250, 600))
      if (index % pool.length === 0) pool = shuffle(pool)
    }
  }

  runLoop()
})()
