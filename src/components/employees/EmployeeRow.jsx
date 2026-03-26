import { useNavigate } from "react-router-dom";
import "./EmployeeRow.css";

function EmployeeRow({ employee }) {
    const navigate = useNavigate();

    function openEmployeeDetails() {
        navigate(`/employees/${employee.id}`);
    }

    function openEditEmployee() {
        navigate(`/employees/edit/${employee.id}`);
    }

    return (
        <tr className="employee-row">
            <td className="cell-link" onClick={openEmployeeDetails}>{employee.id}</td>
            <td className="cell-link" onClick={openEmployeeDetails}>{employee.first_name}</td>
            <td className="cell-link" onClick={openEmployeeDetails}>{employee.last_name}</td>
            <td className="cell-link employee-email" onClick={openEmployeeDetails}>{employee.email}</td>
            <td className="cell-link">
                <span className="position-badge">{employee.position}</span>
            </td>

            <td className="actions">
                <button className="icon-btn edit-btn" onClick={openEditEmployee} title="Uredi">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>

                <button className="icon-btn delete-btn" title="Obriši">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                </button>
            </td>
        </tr>
    );
}

export default EmployeeRow;