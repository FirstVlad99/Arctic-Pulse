import { createSlice } from '@reduxjs/toolkit'

const getInitialFilters = () => {
  const params = new URLSearchParams(window.location.search)
  return {
    categories: params.get('categories')?.split(',') || [],
    dateFrom: params.get('dateFrom') || null,
    dateTo: params.get('dateTo') || null,
    sources: params.get('sources')?.split(',') || [],
    searchQuery: params.get('search') || '',
  }
}

const filtersSlice = createSlice({
  name: 'filters',
  initialState: getInitialFilters(),
  reducers: {
    setCategories: (state, action) => {
      state.categories = action.payload
    },
    setDateRange: (state, action) => {
      state.dateFrom = action.payload.from
      state.dateTo = action.payload.to
    },
    setSources: (state, action) => {
      state.sources = action.payload
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
    },
    resetFilters: () => ({
      categories: [],
      dateFrom: null,
      dateTo: null,
      sources: [],
      searchQuery: '',
    }),
  },
})

export const { setCategories, setDateRange, setSources, setSearchQuery, resetFilters } = filtersSlice.actions
export default filtersSlice.reducer