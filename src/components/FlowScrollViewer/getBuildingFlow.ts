export const GQL_GET_BUILDING_FLOW = `
  query building_flow {
    building_flow(
      limit: 5
      offset: 0
      order_by: [{id: asc_nulls_last}]
      where: {}
    ) {
      id
      created_at
      updated_at
      title
      content
      image {
        url
        id
      }
    }
  }
`;
