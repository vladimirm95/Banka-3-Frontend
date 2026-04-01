import api from "./api";


export const getAccountDetails = async (id) => {
  const response = await api.get(`/accounts/${id}`);
  return response.data;
};


//TODO dodati rutu kada back zavrsi rutu :D
const createBusinessAccount = (data) => {
  return api.post("/business", data);
};

export default {
  createBusinessAccount,
};