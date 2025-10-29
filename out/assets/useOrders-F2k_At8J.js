import{r as d}from"./index-rA_UgCij.js";import{u as g,s as o}from"./useAuth-CjWk1XML.js";const E=()=>{const{user:s}=g(),[i,l]=d.useState([]),[_,c]=d.useState(!0),n=d.useCallback(async()=>{try{c(!0),s&&await o.rpc("set_user_context",{user_id:s.id,user_role:s.role});const{data:t,error:r}=await o.from("orders").select(`
          *,
          order_items (
            *,
            food_items (
              name,
              image_url
            )
          ),
          order_status_history (
            *,
            users (
              full_name
            )
          )
        `).order("created_at",{ascending:!1});if(r)throw r;l(t||[])}catch(t){console.error("Error fetching orders:",t)}finally{c(!1)}},[s]),f=d.useCallback(async t=>{try{await o.rpc("set_user_context",{user_id:t,user_role:(s==null?void 0:s.role)||"customer"});const{data:r,error:e}=await o.from("orders").select(`
          *,
          order_items (
            *,
            food_items (
              name,
              image_url
            )
          ),
          order_status_history (
            *,
            users (
              full_name
            )
          )
        `).eq("user_id",t).order("created_at",{ascending:!1});if(e)throw e;return r||[]}catch(r){return console.error("Error fetching user orders:",r),[]}},[s]);return d.useEffect(()=>{n();const t=o.channel("orders").on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>{n()}).on("postgres_changes",{event:"*",schema:"public",table:"order_status_history"},()=>{n()}).subscribe();return()=>{t.unsubscribe()}},[n]),{orders:i,isLoading:_,fetchOrders:n,fetchUserOrders:f,updateOrderStatus:async(t,r,e)=>{try{s&&await o.rpc("set_user_context",{user_id:s.id,user_role:s.role});const{error:a}=await o.from("orders").update({status:r,updated_at:new Date().toISOString()}).eq("id",t);if(a)throw a;const{error:u}=await o.from("order_status_history").insert({order_id:t,status:r,changed_by:(s==null?void 0:s.id)||null,notes:e||`Status changed to ${r}`});if(u)throw u;await n()}catch(a){throw console.error("Error updating order status:",a),a}},getOrderById:async t=>{try{s&&await o.rpc("set_user_context",{user_id:s.id,user_role:s.role});const{data:r,error:e}=await o.from("orders").select(`
          *,
          order_items (
            *,
            food_items (
              name,
              image_url
            )
          ),
          order_status_history (
            *,
            users (
              full_name
            )
          )
        `).eq("id",t).single();if(e)throw e;return r}catch(r){return console.error("Error fetching order:",r),null}},getTodayStats:()=>{const t=new Date().toISOString().split("T")[0],r=i.filter(e=>e.created_at.startsWith(t));return{totalOrders:r.length,totalSales:r.reduce((e,a)=>e+a.total_amount,0),pendingOrders:r.filter(e=>e.status==="pending").length,preparingOrders:r.filter(e=>e.status==="preparing").length,readyOrders:r.filter(e=>e.status==="ready").length,outForDeliveryOrders:r.filter(e=>e.status==="out_for_delivery").length,completedOrders:r.filter(e=>e.status==="completed").length,cancelledOrders:r.filter(e=>e.status==="cancelled").length}},getOrdersByStatus:t=>i.filter(r=>r.status===t),getOrderStatusHistory:t=>{const r=i.find(e=>e.id===t);return(r==null?void 0:r.order_status_history)||[]},getAllOrderStatuses:()=>["pending","preparing","ready","out_for_delivery","completed","cancelled"]}};export{E as u};
//# sourceMappingURL=useOrders-F2k_At8J.js.map
