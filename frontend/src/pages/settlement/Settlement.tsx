import { useAuth } from '@/features';
import { useConfirmDialog } from '@/common/components';
import type { TAction } from '@/common/components/GlobalModal';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import LoadingComponent from '@/common/LoadingComponent.tsx';
import SettlementDetailModal from '@/pages/settlement/SettlementDetailModal';
import SettlementGrid from '@/pages/settlement/SettlementGrid';
import useSettlementList from '@/pages/settlement/hooks/useSettlementList';
import useSettlementGridState from '@/pages/settlement/hooks/useSettlementGridState';
import useSettlementMutations from '@/pages/settlement/hooks/useSettlementMutations';

export default function Settlement() {
  const { meInfo } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const handleExpiredSession = useExpiredSession();

  const canManageSettlements = meInfo?.isAdmin === true;

  const { settlementRows, isLoading, loadSettlements } = useSettlementList({
    onExpiredSession: handleExpiredSession,
  });

  const gridState = useSettlementGridState({ settlementRows });

  const mutations = useSettlementMutations({
    meInfo,
    confirm,
    loadSettlements,
    onExpiredSession: handleExpiredSession,
  });

  const addSettlementActions: TAction[] = [
    {
      label: mutations.isSubmitting ? 'Saving...' : 'Save',
      onClick: () => {
        void mutations.handleCreateSettlement();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
    },
  ];

  const editSettlementActions: TAction[] = [
    {
      label: mutations.isSubmitting ? 'Updating...' : 'Update',
      onClick: () => {
        void mutations.handleUpdateSettlement();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
    },
  ];

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <>
      <SettlementGrid
        rows={gridState.pagedRows}
        canManageSettlements={canManageSettlements}
        deletingSettlementId={mutations.deletingSettlementId}
        onOpenAddDialog={mutations.handleOpenAddDialog}
        relationFilter={gridState.relationFilter}
        relationOptions={gridState.relationOptions}
        onRelationFilterChange={gridState.setRelationFilter}
        emptyStateMessage={
          gridState.relationFilter
            ? '선택한 Relation에 해당하는 정산 내역이 없습니다.'
            : '등록된 정산 내역이 없습니다.'
        }
        onEdit={mutations.handleOpenEditDialog}
        onDelete={mutations.handleDeleteSettlement}
        totalAmount={gridState.totalAmount}
        totalIncome={gridState.totalIncome}
        totalExpense={gridState.totalExpense}
        carryOverAmount={gridState.carryOverAmount}
        rowsPerPage={gridState.rowsPerPage}
        pageStart={gridState.pageStart}
        pageEnd={gridState.pageEnd}
        totalRows={gridState.totalRows}
        canGoPrevious={gridState.canGoPrevious}
        canGoNext={gridState.canGoNext}
        onRowsPerPageChange={gridState.setRowsPerPage}
        onPreviousPage={gridState.handlePreviousPage}
        onNextPage={gridState.handleNextPage}
      />

      <SettlementDetailModal
        type="ADD"
        open={mutations.openAddDialog}
        handleClose={mutations.handleCloseAddDialog}
        title="ADD SETTLEMENT"
        actions={addSettlementActions}
        form={mutations.addSettlementForm}
        isSubmitting={mutations.isSubmitting}
        onFormChange={mutations.handleChangeAddSettlementForm}
        onAmountTypeChange={mutations.handleAddAmountTypeChange}
      />

      <SettlementDetailModal
        type="EDIT"
        open={mutations.openEditDialog}
        handleClose={mutations.handleCloseEditDialog}
        title="EDIT SETTLEMENT"
        actions={editSettlementActions}
        form={mutations.editSettlementForm}
        isSubmitting={mutations.isSubmitting}
        onFormChange={mutations.handleChangeEditSettlementForm}
        onAmountTypeChange={mutations.handleEditAmountTypeChange}
      />

      {confirmDialog}
    </>
  );
}
