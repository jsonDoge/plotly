import { proxy } from 'valtio'

// Dummy store to trigger change in game from UI (WITHOUT using useState)
export const uiActionCompletedStore = proxy<{ completed: boolean }>()

export const uiActionCompletedActions = {
  setUiActionCompleted: () => {
    uiActionCompletedStore.completed = !uiActionCompletedStore.completed
  },
}
