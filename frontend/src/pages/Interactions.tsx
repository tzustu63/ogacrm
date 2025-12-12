import React, { useState } from 'react'
import InteractionList from '../components/interactions/InteractionList'
import InteractionForm from '../components/interactions/InteractionForm'
import { Interaction } from '../types'

const Interactions: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false)
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateInteraction = () => {
    setSelectedInteraction(null)
    setFormMode('create')
    setFormOpen(true)
  }

  const handleEditInteraction = (interaction: Interaction) => {
    setSelectedInteraction(interaction)
    setFormMode('edit')
    setFormOpen(true)
  }

  const handleFormClose = (shouldRefresh?: boolean) => {
    setFormOpen(false)
    setSelectedInteraction(null)
    // 如果表單成功提交，觸發重新載入
    if (shouldRefresh) {
      setRefreshTrigger(prev => prev + 1)
    }
  }

  return (
    <>
      <InteractionList
        onCreateInteraction={handleCreateInteraction}
        onEditInteraction={handleEditInteraction}
        refreshTrigger={refreshTrigger}
      />

      <InteractionForm
        open={formOpen}
        onClose={() => handleFormClose(false)}
        interaction={selectedInteraction}
        mode={formMode}
        onSuccess={() => handleFormClose(true)}
      />
    </>
  )
}

export default Interactions