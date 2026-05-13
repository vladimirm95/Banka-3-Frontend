import { useState } from "react";
import "./OTCTradingModal.css";

export default function OTCTradingModal({
    open = false,
    onClose,
    onConfirm,
    stock = {},
    loading = false,
    error: externalError = "",
}) {
    const [formData, setFormData] = useState({
        amount: "",
        strikePrice: "",
        settlementDate: "",
        premium: "",
    });

    const [internalError, setInternalError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const handleChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }

        if (internalError) setInternalError("");
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.amount || Number(formData.amount) <= 0) {
            errors.amount = "Količina mora biti veća od 0";
        }

        if (!formData.strikePrice || Number(formData.strikePrice) <= 0) {
            errors.strikePrice = "Strike price mora biti veća od 0";
        }

        if (!formData.settlementDate) {
            errors.settlementDate = "Settlement date je obavezna";
        } else {
            const selectedDate = new Date(formData.settlementDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate <= today) {
                errors.settlementDate = "Datum mora biti u budućnosti";
            }
        }

        if (!formData.premium || Number(formData.premium) <= 0) {
            errors.premium = "Premium mora biti veća od 0";
        }

        return errors;
    };

    const handleConfirm = async () => {
        const errors = validateForm();

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setInternalError("Molim popunite sva polja ispravno");
            return;
        }

        setFieldErrors({});
        setInternalError("");

        try {
            await onConfirm({
                ...formData,
                amount: Number(formData.amount),
                strikePrice: Number(formData.strikePrice),
                premium: Number(formData.premium),
                stockTicker: stock.ticker,
            });
        } catch (err) {
            setInternalError(err.message || "Greška pri kreiranju ponude");
        }
    };

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    if (!open) {
        return null;
    }

    const displayedError = externalError || internalError;

    return (
        <div className="otc-overlay">
            <div className="otc-modal">
                {/* Header */}
                <div className="otc-modal-header">
                    <h2 className="otc-modal-title">
                        Iniciranje pregovora - {stock.ticker || "Akcija"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="otc-modal-close"
                        aria-label="Zatvori"
                    >
                        ✕
                    </button>
                </div>

                <p className="otc-modal-subtitle">
                    Unesite detalje za iniciranje pregovora o opciji
                </p>

                <div className="otc-form">
                    <div className="otc-form-group">
                        <label htmlFor="amount" className="otc-form-label">
                            Količina akcija *
                        </label>
                        <input
                            id="amount"
                            type="number"
                            inputMode="decimal"
                            min="1"
                            step="1"
                            placeholder="Npr. 100"
                            value={formData.amount}
                            onChange={(e) =>
                                handleChange("amount", e.target.value)
                            }
                            className={`otc-input ${
                                fieldErrors.amount ? "otc-input--error" : ""
                            }`}
                        />
                        {fieldErrors.amount && (
                            <p className="otc-field-error">
                                {fieldErrors.amount}
                            </p>
                        )}
                    </div>

                    <div className="otc-form-group">
                        <label htmlFor="strikePrice" className="otc-form-label">
                            Strike Price (cena po akciji) *
                        </label>
                        <input
                            id="strikePrice"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            placeholder="Npr. 150.50"
                            value={formData.strikePrice}
                            onChange={(e) =>
                                handleChange("strikePrice", e.target.value)
                            }
                            className={`otc-input ${
                                fieldErrors.strikePrice
                                    ? "otc-input--error"
                                    : ""
                            }`}
                        />
                        {fieldErrors.strikePrice && (
                            <p className="otc-field-error">
                                {fieldErrors.strikePrice}
                            </p>
                        )}
                    </div>

                    <div className="otc-form-group">
                        <label
                            htmlFor="settlementDate"
                            className="otc-form-label"
                        >
                            Settlement Date (datum dospeća) *
                        </label>
                        <input
                            id="settlementDate"
                            type="date"
                            min={getTodayDate()}
                            value={formData.settlementDate}
                            onChange={(e) =>
                                handleChange("settlementDate", e.target.value)
                            }
                            className={`otc-input ${
                                fieldErrors.settlementDate
                                    ? "otc-input--error"
                                    : ""
                            }`}
                        />
                        {fieldErrors.settlementDate && (
                            <p className="otc-field-error">
                                {fieldErrors.settlementDate}
                            </p>
                        )}
                    </div>

                    <div className="otc-form-group">
                        <label htmlFor="premium" className="otc-form-label">
                            Premium (cena ugovora) *
                        </label>
                        <input
                            id="premium"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            placeholder="Npr. 500.00"
                            value={formData.premium}
                            onChange={(e) =>
                                handleChange("premium", e.target.value)
                            }
                            className={`otc-input ${
                                fieldErrors.premium ? "otc-input--error" : ""
                            }`}
                        />
                        {fieldErrors.premium && (
                            <p className="otc-field-error">
                                {fieldErrors.premium}
                            </p>
                        )}
                    </div>
                </div>

                {displayedError && (
                    <p className="otc-modal-error">{displayedError}</p>
                )}

                <div className="otc-modal-actions">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="otc-btn otc-btn--cancel"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="otc-btn otc-btn--confirm"
                    >
                        {loading ? "Kreiram..." : "Inicijujem pregovor"}
                    </button>
                </div>
            </div>
        </div>
    );
}