import React from 'react';
import Dp from '../Images/Anadi1_dp.png';
import Fade from 'react-reveal/Fade';

function About(props) {
    return (
        <div className="container-fluid my-5 py-5">
        <div className="row">
        <div className="col-12 mx-auto">
        <div className="row">
         <div className="col-md-5 pl-4 pt-5 order-1 order-lg-1">
            <div><Fade left>
               <img 
               src={Dp} 
               className="ml-2 pl-5"
               height="450px" 
               style={{"boxShadow":"-5px 5px 5px #06D85F"}}
               alt="Profile_pic">
               </img></Fade>
            </div>
         </div>
        <div className="col-md-6 pt-5 pl-5 order-2 order-lg-2">
        <Fade right big cascade><h1 style={{ "color": "#E91E63" }}>About</h1></Fade>
        <Fade right><p className="text-muted pr-5">
            I am here to <code>&lt;code&gt;</code> ideas and bring them to life.
          <br/>I Hate sleeping so I am here to provide my services to my clients.
          <br/>It's boredom to not have tension that's why I keep myself engaged in coding and developing UI/UX.
          <br/>I am a BCA (Bachelor of Computer Application) student by profession. 
          <br/>Pursuing the degree from Graphic Era Deemed To Be University, Dehradun, Uttrakhand, India. 
          <br/>By interest I am a web developer and designer now. It's fun to program some real world apps, and 
          <br/>I am an intermediate react.js developer. Exploring opportunities to grab some great projects and 
          <br/>have some great learning experience.   
          </p></Fade>
          </div>
        </div>
        </div>
        </div>
        </div>
    );
}

export default About;