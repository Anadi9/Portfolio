import React from 'react';
import Greeting from '../Contents/Greeting';
import { CoolIcon } from './../Contents/Icons';
import Home from '../Contents/Home';
import About from '../Contents/About';
import Dp from '../Images/Anadi1_dp.jpg';
import Webpage from '../Images/webpage.svg';
import Education from './../Contents/Education';
import Skills from './../Contents/Skills';
import Contact from '../Contents/Contact';

function HomePage(props) {
    return (
        <div>
          <div className="parallax1"><br/><br/>
          <div className="container text-center">
          <h2 className="text-warning"><Greeting/></h2>
          <h1 className="text-warning"><strong className="text-danger">ANADI THAKUR</strong> here <CoolIcon/></h1>
          <img src={Dp} className="rounded" height="300" alt="Profile_pic"></img>
          </div></div>
        <div className="container-fluid text-center">
          <div className="col"><Home/></div>
          <div className="col"><img src={Webpage} height="200px" alt=""/></div><br/><br/>
        </div>
        <div className="parallax2"> 
        </div>
        <div className="container-fluid text-center">
        <About/>
        </div>
        <div className="parallax3"> 
        </div>
        <div className="container-fluid text-center">
        <Education/>
        </div>
        <div className="parallax4"> 
        </div>
        <div className="container-fluid text-center">
        <Skills/>
        </div>
        <div className="parallax5">
        <div className="text-center">
        <Contact/>
        </div>
        </div>
      </div>  
    );
}

export default HomePage;