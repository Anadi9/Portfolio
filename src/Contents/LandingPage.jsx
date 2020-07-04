import React from 'react';


function LandingPage(props) {
    return (
        <div className="container-fluid">
        <div className="row">
        <div className="col-12 mx-auto">
         <div className="col-md-8 mt-5 mx-auto">
         <div className="text-center mt-5">
         <h4 className="pt-5" style={{"color": "white",}}>Hello! I am</h4>
         <h1 className="pt-4"><strong
         style={{ "fontSize": "3em" ,"color": "#06D85F", "fontFamily": "Alex Brush, cursive", "wordSpacing": "5px", "letterSpacing": "4px"}}>
         Anadi Thakur</strong></h1>
            <h2 className="pt-4" 
            style={{"color": "black", "textShadow": "3px 1px 0px #E91E63", "wordSpacing": "5px"}}>
            | DEVELOPER | DESIGNER | PROGRAMMER | FREELANCER |
            </h2>
         </div>
         </div>
        </div>
        </div>
        </div>
    );
}

export default LandingPage;