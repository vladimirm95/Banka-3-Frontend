import { useState } from "react"
import OrderForm from "./OrderForm"
import OrderDialog from "./OrderDialog"
import { createOrder } from "../services/OrderService"
import "./TradingPage.css"

export default function TradingPage(){

  const [order,setOrder] = useState(null)

  return(
    <div className="trading-page">

      <div className="trading-layout">

        <OrderForm
          onSubmit={(data)=>setOrder(data)}
        />

      </div>

      <OrderDialog
        order={order}
        onConfirm={()=>{
          createOrder(order).then(()=>{
            setOrder(null)
          })
        }}
        onCancel={()=>setOrder(null)}
      />

    </div>
  )
}
