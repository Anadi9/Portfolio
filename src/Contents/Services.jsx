import React from 'react';

function Services(props) {
    return (
        <div className="container-fluid" style={{"backgroundColor": "#06D85F"}}>
        <h1  className="text-center" style={{ "color": "white" }}>Services</h1>
           <div className="row">
           <div className="col-10 mx-auto">
            <div className="row">
             <div className="col-md-4 mx-auto my-3 order-1 order-lg-1">
               <div className="text-center">
               <i className="fa fa-5x fa-paint-brush mb-2"></i>
                 <h3>Beautiful Design</h3>
                 <p>Website is beautiful, unique and tailored to suit your needs and requirements.</p>
               </div>
             </div>
             <div className="col-md-4 mx-auto my-3 order-2 order-lg-2">
               <div className="text-center">
               <i className="fa fa-5x fa-code mb-2"></i>
                 <h3>Clean Code</h3>
                 <p>Project is well-structured with clean clean codes. Codes are written in HTML/CSS, React/JSX, ES6/Javascript.</p>
               </div>
             </div>
             <div className="col-md-4 mx-auto my-3 order-3 order-lg-3">
               <div className="text-center">
               <i className="fa fa-5x fa-tablet mb-2"></i>
                 <h3>Always Responsive
                 </h3>
                 <p>Try to make websites completely responsive. They will look great on desktop, tablets and mobile phones too.</p>
               </div>
             </div>
           </div>
           </div>
           </div>
           </div>
    );
}

export default Services;