import React from 'react';

function ReviewBox(props) {
    return (
        <div>
        <h6 className="text-muted">Rate me  <span role="img" aria-label="">⭐️⭐️⭐️⭐️⭐️</span></h6>
        <h6 className="text-muted">Review my work</h6>
        <label htmlFor="" className="text-muted">Your Name</label><br/>
        <input type="text" className="w-25"></input><br/>
        <label htmlFor="" className="text-muted">Your Review</label>
        <textarea className="form-control w-50" rows="3"></textarea><br/>
        <button type="button" className="btn btn-primary btn-sm">Submit</button>
        </div>
    );
}

export default ReviewBox;