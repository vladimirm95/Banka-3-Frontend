import api from "./api.js";

/**
 * Transfer funds to another client's account.
 * @param {Object} data
 * @param {string} data.sender_account
 * @param {string} data.recipient_account
 * @param {string} data.recipient_name
 * @param {number} data.amount
 * @param {string} data.payment_code
 * @param {string} data.reference_number
 * @param {string} data.purpose
 */
export async function transferFunds(data, totpCode) {
    const response = await api.post("/transactions/payment", data, {
        headers: { "TOTP": totpCode }
    });
    return response.data;
}

// Transfer funds between user's own accounts
export async function transferBetweenOwnAccounts(fromAccount, toAccount, amount, description) {
    const response = await api.post("/transactions/transfer", {
        from_account: fromAccount,
        to_account: toAccount,
        amount: parseFloat(amount),
        description: description || "Transfer between own accounts"
    });
    return response.data;
}