import { Box, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useAuth } from '../contexts/AuthContext';

interface SettlementRecord {
  id: number;
  date: string;
  item: string;
  amount: number;
  relation: string;
}

const settlementRows: SettlementRecord[] = [
  { id: 1, date: '2025/11/29', item: '엄랑강정팡', amount: -100500, relation: '2025년' },
  { id: 2, date: '2025/11/29', item: '피양옥', amount: -230000, relation: '2025년' },
  { id: 3, date: '2025/10/25', item: '이자', amount: 54, relation: '2025년' },
  { id: 4, date: '2025/09/27', item: '이자', amount: 68, relation: '2025년' },
  { id: 5, date: '2025/08/23', item: '이자', amount: 54, relation: '2025년' },
  { id: 6, date: '2025/07/26', item: '이자', amount: 54, relation: '2025년' },
  { id: 7, date: '2025/06/28', item: '이자', amount: 81, relation: '2025년' },
  { id: 8, date: '2025/06/23', item: '이경 2025년 회비', amount: 120000, relation: '2025년 회비' },
  { id: 9, date: '2025/06/23', item: '상반기 모임 정산', amount: 115128, relation: '2025년' },
  { id: 10, date: '2025/06/21', item: '노래방', amount: -102000, relation: '2025년' },
  { id: 11, date: '2025/06/21', item: '고릴레지프', amount: -219000, relation: '2025년' },
  { id: 12, date: '2025/06/21', item: '서경', amount: -190000, relation: '2025년' },
  { id: 13, date: '2025/05/24', item: '이자', amount: 46, relation: '2025년' },
  { id: 14, date: '2025/05/16', item: '이은실 2025년 회비', amount: 60000, relation: '2025년 회비' },
  { id: 15, date: '2025/05/14', item: '박성모 2025년 회비', amount: 60000, relation: '2025년 회비' },
  { id: 16, date: '2025/05/08', item: '박경수 2025년 회비', amount: 120000, relation: '2025년 회비' },
  { id: 17, date: '2025/05/08', item: '세리언 2025 회비', amount: 120000, relation: '2025년 회비' },
  { id: 18, date: '2025/05/08', item: '진승진 2025년 회비', amount: 120000, relation: '2025년 회비' },
  { id: 19, date: '2025/05/08', item: '정혜 2025년 회비', amount: 120000, relation: '2025년 회비' },
  { id: 20, date: '2025/05/08', item: '김혜영 2025년 회비', amount: 120000, relation: '2025년 회비' },
  { id: 21, date: '2025/05/07', item: '이재훈 2025년 회비', amount: 120000, relation: '2025년 회비' },
  { id: 22, date: '2025/04/26', item: '이자', amount: 11, relation: '2025년' },
  { id: 23, date: '2025/03/29', item: '이자', amount: 11, relation: '2025년' },
  { id: 24, date: '2025/03/01', item: '이자', amount: 14, relation: '2025년' },
  { id: 25, date: '2025/01/25', item: '이자', amount: 11, relation: '2025년' },
  { id: 26, date: '2024/12/28', item: '이자', amount: 14, relation: '2024년' },
  { id: 27, date: '2024/11/23', item: '이자', amount: 45, relation: '2024년' },
  { id: 28, date: '2024/11/18', item: '정재근 2024년 회비', amount: 120000, relation: '2024년 회비' },
  { id: 29, date: '2024/11/16', item: '한일관', amount: -656000, relation: '2024년' },
  { id: 30, date: '2024/10/26', item: '이자', amount: 52, relation: '2024년' },
  { id: 31, date: '2024/09/28', item: '이자', amount: 65, relation: '2024년' },
  { id: 32, date: '2024/08/24', item: '이자', amount: 52, relation: '2024년' },
  { id: 33, date: '2024/07/27', item: '이자', amount: 55, relation: '2024년' },
  { id: 34, date: '2024/07/01', item: '상반기 모임 정산', amount: 164, relation: '2024년' },
  { id: 35, date: '2024/06/29', item: '이자', amount: 69, relation: '2024년' },
  { id: 36, date: '2024/06/29', item: '정혜 2024년 회비', amount: 120000, relation: '2024년 회비' },
  { id: 37, date: '2024/06/29', item: '박경수 2024년 회비', amount: 120000, relation: '2024년 회비' },
  { id: 38, date: '2024/06/29', item: '한우실상', amount: -410000, relation: '2024년' },
  { id: 39, date: '2024/06/29', item: '텀블러비어', amount: -46764, relation: '2024년' },
  { id: 40, date: '2024/06/04', item: '진승진 2024년 회비', amount: 120000, relation: '2024년 회비' },
  { id: 41, date: '2024/05/31', item: '양동수 2024년 회비', amount: 120000, relation: '2024년 회비' },
  { id: 42, date: '2024/05/31', item: '서예진 2024년 회비', amount: 120000, relation: '2024년 회비' },
  { id: 43, date: '2024/05/25', item: '이자', amount: 41, relation: '2024년' },
  { id: 44, date: '2024/04/27', item: '이자', amount: 51, relation: '2024년' },
  { id: 45, date: '2024/03/23', item: '이자', amount: 41, relation: '2024년' },
  { id: 46, date: '2024/02/24', item: '이자', amount: 41, relation: '2024년' },
  { id: 47, date: '2024/01/27', item: '이자', amount: 33, relation: '2024년' },
  { id: 48, date: '2024/01/10', item: '박성모 2024년 회비', amount: 60000, relation: '2024년 회비' },
  { id: 49, date: '2024/01/06', item: '김혜영 2024년 회비', amount: 120000, relation: '2024년 회비' },
];

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const formatAmount = (amount: number) => {
  const absoluteAmount = currencyFormatter.format(Math.abs(amount));
  return amount < 0 ? `-${absoluteAmount}` : absoluteAmount;
};

const settlementColumns: GridColDef<SettlementRecord>[] = [
  {
    field: 'date',
    headerName: '날짜',
    minWidth: 130,
    flex: 0.85,
  },
  {
    field: 'item',
    headerName: '항목',
    minWidth: 220,
    flex: 1.3,
    sortable: false,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box component="span" sx={{ opacity: 0.75 }}>
          📄
        </Box>
        <Typography
          variant="body2"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {params.value}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'amount',
    headerName: '금액',
    minWidth: 130,
    flex: 0.75,
    align: 'right',
    headerAlign: 'right',
    renderCell: (params) => (
      <Typography
        variant="body2"
        sx={{ width: '100%', textAlign: 'right', color: params.value < 0 ? '#FCA5A5' : '#E5E7EB' }}
      >
        {formatAmount(params.value as number)}
      </Typography>
    ),
  },
  {
    field: 'relation',
    headerName: 'Relation',
    minWidth: 170,
    flex: 0.95,
    sortable: false,
    renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#86EFAC' }}>
        🐍 {params.value}
      </Typography>
    ),
  },
];

export default function Settlement() {
  const { meInfo } = useAuth();
  const totalAmount = settlementRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
          🐝 정산
        </Typography>
        {meInfo && (
          <Typography variant="body2" sx={{ mt: 0.5, color: '#6B7280' }}>
            {meInfo.name} ({meInfo.email})
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          height: { xs: 560, md: 920 },
          border: '1px solid #2A2D33',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#0F1115',
        }}
      >
        <DataGrid
          rows={settlementRows}
          columns={settlementColumns}
          rowHeight={42}
          disableRowSelectionOnClick
          pageSizeOptions={[20, 30, 50]}
          initialState={{
            sorting: {
              sortModel: [{ field: 'date', sort: 'desc' }],
            },
            pagination: {
              paginationModel: { pageSize: 20, page: 0 },
            },
          }}
          sx={{
            border: 'none',
            color: '#E5E7EB',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: '#11151A',
              borderBottom: '1px solid #2A2D33',
            },
            '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
              borderRight: '1px solid #23262D',
            },
            '& .MuiDataGrid-row': {
              bgcolor: '#0F1115',
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: '#171B22',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #23262D',
            },
            '& .MuiDataGrid-footerContainer': {
              bgcolor: '#11151A',
              borderTop: '1px solid #2A2D33',
            },
            '& .MuiDataGrid-columnSeparator': {
              color: '#2A2D33',
            },
            '& .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-menuIconButton': {
              color: '#9CA3AF',
            },
            '& .MuiDataGrid-sortIcon': {
              color: '#9CA3AF',
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
              outline: 'none',
            },
          }}
        />
      </Box>

      <Box
        sx={{
          mt: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#6B7280',
        }}
      >
        <Typography variant="caption">↓ 더 불러오기</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          합계 {formatAmount(totalAmount)}
        </Typography>
      </Box>
    </Box>
  );
}
