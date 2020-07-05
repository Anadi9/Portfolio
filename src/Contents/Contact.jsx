import React from 'react';
import Background from '../Components/Background';
import Slide from 'react-reveal/Slide';

function Contact(props) {
    return (
        <div>
        <Background/>
        <Slide top>
        <div className="container-fluid py-4">
             <h1 className="text-center mt-5" style={{ "color": "#E91E63" }}>Get in touch <i className="fa fa-hand-pointer-o"></i></h1>
             <div className="row">
        <div className="col-12 mx-auto"></div>
          <div className=" text-center pt-5 text-white">
          <p><i className="fa fa-2x fa-map"></i> Location :- Gurugram, Haryana, India</p>
             <p className=" text-white">
             <i className="fa fa-2x fa-phone"></i> Phone:- +91 74669 14279
             </p>
             <p className="text-white pb-5">
             <i className="fa fa-2x fa-envelope"></i> E-mail:- anadithakur99@gmail.com</p>
          </div>
          </div>
          </div>
          <div className="social d-flex justify-content-center">
             <a className="mx-2" href="https://www.facebook.com/anadi.thakur.3"><i className="fa fa-facebook"></i></a>
             <a className="mx-2" href="https://www.instagram.com/anadi_thakur_9"><i className="fa fa-instagram"></i></a>
             <a className="mx-2" href="https://github.com/Anadi9"><i className="fa fa-github"></i></a>
             <a className="mx-2" href="https://www.linkedin.com/in/anadi-thakur-92163316b"><i className="fa fa-linkedin"></i></a>
          </div>
          </Slide>
        </div>
    );
}

export default Contact;