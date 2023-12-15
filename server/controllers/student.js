import Student from "../models/Student.js";
import bcrypt from "bcryptjs";
import { createError } from "../utils/error.js";
import jwt from "jsonwebtoken";


function generateClassCode(semester, department) {
  const index = departments.findIndex(d => d.name === department)
  return `${departments[index].code}-${semester}`;
}

export const registerStudent = async (req, res, next) => {
  try {

    const em = await Student.findOne({ email: req.body.email });
    if (em)
      return res.status(409).send({ message: "User with given email already exists" })


    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);

    const newStudent = new Student({
      ...req.body,
      password: hash,
    });

    await newStudent.save();

     // Automatically inject the new student into the associated class
    await Class.findByIdAndUpdate(
      req.body.class,
      { $addToSet: { students: newStudent._id } },
      { new: true }
    );

    res.status(200).send("Student has been created.");
  } catch (err) {
    next(err);
  }
};


export const loginStudent = async (req, res, next) => {
  try {
    const user = await Student.findOne({ username: req.body.username });
    if (!user) return next(createError(404, "User not found!"));

    const isPasswordCorrect = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!isPasswordCorrect)
      return next(createError(400, "Wrong password or username!"));

    const token = jwt.sign(
      { id: user._id},
      process.env.JWT
    );

    const { password, ...otherDetails } = user._doc;
    res
      .cookie("access_token", token, {
        httpOnly: true,
      })
      .status(200)
      // sending all details except password
      .json({ details: { ...otherDetails } });
  } catch (err) {
    next(err);
  }
};

export const updateStudent = async (req, res, next) => {
  try {

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    // Update the student in the class
    await Class.findByIdAndUpdate(
      req.body.class,
      { $addToSet: { students: updatedStudent._id } },
      { new: true }
    );
    res.status(200).json(updatedStudent);
  } catch (err) {
    next(err);
  }
};

export const deleteStudent = async (req, res, next) => {
    try {
      const student = await Student.findByIdAndDelete(req.params.id);

        // Remove the student from the class
        await Class.findByIdAndUpdate(
            student.class,
            { $pull: { students: student._id } },
            { new: true }
        );

      res.status(200).json("the Student has been deleted");
    } catch (err) {
      next(err);
    }
  };
  
  export const getStudent = async (req, res, next) => {
    try {
      const student = await Student.findById(req.params.id)
      .populate('class', 'name')
      .populate('courses');

      // Check if the student and student.class are present
    if (student && student.class) {
      // Transform the data before sending it in the response
      const { class: { name, ...classInfo }, ...rest } = student.toObject();
      const transformedStudent = { ...rest, classname: name, classInfo };

      res.status(200).json(transformedStudent);
    }
    else 
      res.status(200).json(student)
   } catch (err) {
      next(err);
    }
  };
  
  export const getStudents = async (req, res, next) => {
    try {
      const students = await Student.find()
      .populate('class', 'name')
      .populate('courses');
      const transformedStudents = students.map(student => {
        const { class: { name, ...classInfo }, ...rest } = student.toObject();
        return { ...rest, classname: name, classInfo };
      });
  
      res.status(200).json(transformedStudents);
    } catch (err) {
      next(err)
    }
  }