const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { get } = require('http');
const { isObject } = require('util');
const prisma = new PrismaClient();

//keejun just get post information through postID
const getPostinfo = async (req, res) => {
  const { postId } = req.params;
  console.log(postId);
  try {
    const postt = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
      include: {
        user: { select: { email: true } }, // Ensure the email is fetched
      },
    });

    if (!postt) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const dirr = postt.photosFolder;
    if (fs.existsSync(dirr)) {
      postt.photo = fs.readdirSync(dirr).map((file) => `${dirr}/${file}`);
    } else {
      postt.photo = [];
    }

    // Simplify the response by removing the unnecessary nesting
    const responsePost = {
      title: postt.title,
      price: postt.price,
      description: postt.desc,
      email: postt.user.email,
      photo: postt.photo,
    };

    res.status(200).json(responsePost);
    console.log(responsePost);
  } catch (error) {
    console.error('error in /api/user/get-post/:postId', error);
    res.status(500).json({ error: error.message });
  }
};

const newUser = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        email: email,
      },
    });
    res.status(200).json(user);
    // return;
  } catch (error) {
    console.log('error in /api/newUser', error);
    res.status(500).json({ error: error.message });
  }
};

const newPost = async (req, res) => {
  console.log('this is req.body', req.body);
  const { title, desc, price, userId } = req.body;
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
  });
  console.log('user', user);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  try {
    const post = await prisma.post.create({
      data: {
        title: title,
        desc: desc,
        price: parseInt(price),
        userId: parseInt(userId),
      },
    });
    return res.status(200).json({ postId: post.id });
  } catch (error) {
    console.log('error in /api/user/new-post', error);
    return res.status(500).json({ error: error.message });
  }
};

//vincent WIP pray this works
const editPost = async (req, res) => {
  console.log('req to edit', req.body);

  const { title, price, desc, userId, postId } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
  });
  if (!user) {
    return res.status(404).json({ error: 'User ID not found' });
  }

  const post = await prisma.post.findUnique({
    where: { id: parseInt(postId) },
  });
  if (!post) {
    return res.status(404).json({ error: 'Post ID not found' });
  }

  try {
    const updatedPost = await prisma.post.update({
      where: {
        id: parseInt(postId),
        userId: parseInt(userId),
      },
      data: {
        title: title,
        price: parseInt(price),
        desc: desc,
        //userId: parseInt(userId),
        //postId: parseInt(postId),
      },
    });
    return res
      .status(200)
      .json({ message: 'post edited', postId: updatedPost.id });
  } catch (error) {
    console.log('error in /api/user/edit-post/:postId', error);
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
};

//vincent WIP probably doesnt work
const removePost = async (req, res) => {
  console.log('req to remove', req.body);
  const { userId, postId } = req.body;

  try {
    console.log('uid: ', userId, 'pid:', postId);
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });
    if (!user) {
      return res.status(404).json({ error: 'User ID not found' });
    }

    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
    });
    if (!post) {
      return res.status(404).json({ error: 'Post ID not found' }); //404 not found
    }

    if (post.userId !== user.id) {
      return res
        .status(403)
        .json({ error: 'User does not have permission to remove post' }); //403 no permission to access
    }

    await prisma.post.delete({
      where: {
        userId: parseInt(userId),
        id: parseInt(postId),
      },
    });

    return res.status(200).json({ message: 'post removed' }); //success status 200
  } catch (error) {
    console.log('error in /api/user/remove-post/:postId', error);
    return res.status(500).json({ error: error.message }); //server error encounter
  }
};

const storageForPostPictures = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;
    const { userId, postId } = req.query;
    console.log('this is the userId inside storage', userId);
    console.log('this is the file', file);
    if (postId) {
      dir = `uploads/posts/${userId}/${postId}`;
    } else {
      dir = `uploads/profilePicture/${userId}`;
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const { postId } = req.query;
    let filename;

    // if (postId) {
    //   filename = uuidv4() + path.extname(file.originalname);
    // } else {
    //   filename = uuidv4() + path.extname(file.originalname);
    // }

    filename = uuidv4() + path.extname(file.originalname);

    cb(null, filename);
  },
});

const uploadPostPictures = multer({ storage: storageForPostPictures });

const handleUpload = async (req, res) => {
  const { userId, postId } = req.query;
  try {
    const photosFolder = `uploads/posts/${userId}/${postId}`;
    await prisma.post.update({
      where: {
        id: parseInt(postId),
      },
      data: {
        photosFolder,
      },
    });
    res.status(200).json({ message: 'success' });
  } catch (error) {
    console.log('error in /api/user/add-images-to-new-post', error);
    return res.status(500).json({ error: error.message });
  }
};

// const getUserPosts = async (req, res) => {
//   console.log(req.params);
//   const { userId } = req.params;
//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: parseInt(userId) },
//       include: { posts: true },
//     });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Add photos to each post
//     for (let post of user.posts) {
//       const dir = post.photosFolder;
//       if (fs.existsSync(dir)) {
//         post.photos = fs.readdirSync(dir).map((file) => `${dir}/${file}`);
//       } else {
//         post.photos = [];
//       }
//     }

//     res.status(200).json(user);
//   } catch (error) {
//     console.log('error in /api/user/get-posts/:userId', error);
//     res.status(500).json({ error: error.message });
//   }
// };

//vin
const getUserPost = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
      include: { user: true },
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Add photos to each post
    const dir = post.photosFolder;
    if (fs.existsSync(dir)) {
      post.photos = fs.readdirSync(dir).map((file) => `${dir}/${file}`);
    } else {
      post.photos = [];
    }

    res.status(200).json(post);
  } catch (error) {
    console.log('error in /api/user/get-post/:postId', error);
    console.log(postId);
    res.status(500).json({ error: error.message });
  }
};

// const updateUserProfile = async (req, res) => {
//   const { id } = req.params;
//   console.log('this is req.body', req.body);
//   const { displayName, username, pronouns, bio } = req.body;

//   console.log('displayName: ', displayName);
//   try {
//     const update = await prisma.user.update({
//       where: {
//         id: parseInt(id),
//       },
//       data: {
//         name: displayName,
//         username: username,
//         pronouns: pronouns,
//         bio: bio,
//       },
//     });
//     console.log(update);
//     res.status(200).json(update);
//   } catch (error) {
//     console.log('error in /api/user/update-profile/:id', error);

//     if (error.code == 'P2002') {
//       res.status(409).json({ error: error });
//     } else {
//       res.status(500).json({ error: error });
//     }
//   }
// };

// const handleProfilePictureUpload = async (req, res) => {
//   const { userId } = req.params;
//   if (!req.file) {
//     return res.status(400).send('No file uploaded.');
//   }

//   const profilePicturePath = req.file.path;

//   try {
//     await prisma.user.update({
//       where: { id: parseInt(userId) },
//       data: { profilePicture: profilePicturePath },
//     });

//     res.send({ message: 'Profile picture updated successfully!' });
//   } catch (error) {
//     console.error('Failed to upload profile picture:', error);
//     res.status(500).send({ error: 'Failed to update profile picture.' });
//   }
// };

// ----------------------------------------------------------
const getUser = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        posts: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Read the profile picture directory
    const profilePictureDir = user.profilePicture;
    let profilePictureFile = null;

    if (fs.existsSync(profilePictureDir)) {
      const files = fs.readdirSync(profilePictureDir);
      if (files.length > 0) {
        // Assume the first file is the profile picture
        profilePictureFile = path.join(profilePictureDir, files[0]);
      }
    }

    // Add the profile picture path to the user object
    user.profilePictureFile = profilePictureFile;

    res.status(200).json(user);
  } catch (error) {
    console.log('error in /api/getUser', error);
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
        archived: false,
      },
      include: {
        posts: {
          where: {
            archived: false,
          },
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Read the profile picture directory
    const profilePictureDir = user.profilePicture;
    let profilePictureFile = null;

    if (fs.existsSync(profilePictureDir)) {
      const files = fs.readdirSync(profilePictureDir);
      if (files.length > 0) {
        // Assume the first file is the profile picture
        profilePictureFile = path.join(profilePictureDir, files[0]);
      }
    }

    // Add the profile picture path to the user object
    user.profilePictureFile = profilePictureFile;

    // Add photos to each post
    for (let post of user.posts) {
      const dir = post.photosFolder;
      if (fs.existsSync(dir)) {
        post.photos = fs.readdirSync(dir).map((file) => `${dir}/${file}`);
      } else {
        post.photos = [];
      }
    }

    res.status(200).json(user);
  } catch (error) {
    console.log('error in /api/getUserById', error);
    res.status(500).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const { id, name, email, pronouns, bio } = req.body;
  try {
    console.log('this is req.body', req.body);
    const user = await prisma.user.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name: name,
        email: email,
        pronouns: pronouns,
        bio: bio,
      },
    });
    res.status(200).json(user);
  } catch (error) {
    console.log('error in /api/user/updateProfile', error);
    res.status(500).json({ error: error.message });
  }
};

const storageForProfilePicture = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;
    const { userId } = req.query;
    console.log('this is the userId inside storage', userId);
    console.log('this is the file', file);

    dir = `uploads/profilePicture/${userId}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.readdir(dir, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) throw err;
          });
        }
      }
    });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    let filename = uuidv4() + path.extname(file.originalname);

    cb(null, filename);
  },
});

const uploadProfilePicture = multer({ storage: storageForProfilePicture });

const updateProfilePicture = async (req, res) => {
  const { userId } = req.query;
  console.log('this is the userId from updateProfilePicture', userId);
  try {
    console.log('path from uploadProfilePicture', req.file);
    const profilePicturePath = `uploads/profilePicture/${userId}`;
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { profilePicture: profilePicturePath },
    });
    res.status(200).json({ message: 'Profile picture updated successfully!' });
  } catch (error) {
    console.error('Failed to upload profile picture:', error);
    res.status(500).send({ error: 'Failed to update profile picture.' });
  }
};

const getUserPosts = async (req, res) => {
  const { userId } = req.params;
  try {
    const posts = await prisma.post.findMany({
      where: {
        userId: parseInt(userId),
        archived: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    if (!posts) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add photos to each post
    for (let post of posts) {
      const dir = post.photosFolder;
      if (fs.existsSync(dir)) {
        post.photos = fs.readdirSync(dir).map((file) => `${dir}/${file}`);
      } else {
        post.photos = [];
      }
    }

    res.status(200).json(posts);
  } catch (error) {
    console.log('error in /api/user/get-posts/:userId', error);
    res.status(500).json({ error: error.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        archived: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        user: true,
        WishList: {
          select: {
            userId: true,
          },
        },
      },
    });

    for (let post of posts) {
      const dir = post.photosFolder;
      if (fs.existsSync(dir)) {
        post.photos = fs.readdirSync(dir).map((file) => `${dir}/${file}`);
      } else {
        post.photos = [];
      }
    }

    res.status(200).json(posts);
  } catch (error) {
    console.log('error in /api/getAllPosts', error);
    res.status(500).json({ error: error.message });
  }
};

const getFilteredPosts = async (req, res) => {
  const { searchTerm, minPrice, maxPrice, priceSort } = req.body;
  let priceFilter = {};

  if (maxPrice === 100) {
    priceFilter = {
      gte: parseInt(minPrice),
    };
  } else {
    priceFilter = {
      gte: parseInt(minPrice),
      lte: parseInt(maxPrice),
    };
  }

  let searchFilter = {};
  if (searchTerm !== '') {
    searchFilter = {
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          desc: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ],
    };
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
        archived: false,
        ...searchFilter,
        price: priceFilter,
      },
      include: {
        user: true,
        WishList: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        price: priceSort,
      },
    });

    for (let post of posts) {
      const dir = post.photosFolder;
      if (fs.existsSync(dir)) {
        post.photos = fs.readdirSync(dir).map((file) => `${dir}/${file}`);
      } else {
        post.photos = [];
      }
    }

    res.status(200).json(posts);
  } catch (error) {
    console.log('error in /api/getFilteredPosts', error);
    res.status(500).json({ error: error.message });
  }
};

const archivePost = async (req, res) => {
  const { postId } = req.body;
  try {
    const post = await prisma.post.update({
      where: {
        id: parseInt(postId),
      },
      data: {
        archived: true,
      },
    });
    res.status(200).json(post);
  } catch (error) {
    console.log('error in /api/post/archivePost', error);
    res.status(500).json({ error: error.message });
  }
};

const updatePost = async (req, res) => {
  const { postId, title, price, desc } = req.body;
  try {
    const post = await prisma.post.update({
      where: {
        id: parseInt(postId),
      },
      data: {
        title: title,
        price: parseInt(price),
        desc: desc,
      },
    });
    res.status(200).json(post);
  } catch (error) {
    console.log('error in /api/post/updatePost', error);
    res.status(500).json({ error: error.message });
  }
};

const getPost = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId), archived: false },
      include: {
        user: true,
      },
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const dir = post.photosFolder;
    if (fs.existsSync(dir)) {
      post.photos = fs.readdirSync(dir).map((file) => `${dir}/${file}`);
    }
    const profilePictureDir = post.user.profilePicture;
    if (fs.existsSync(profilePictureDir)) {
      const files = fs.readdirSync(profilePictureDir);
      if (files.length > 0) {
        post.user.profilePicture = `${profilePictureDir}/${files[0]}`;
      }
    }

    res.status(200).json(post);
  } catch (error) {
    console.log('error in /api/post/:postId', error);
    res.status(500).json({ error: error.message });
  }
};

const addAReview = async (req, res) => {
  const { userId, comment, rating } = req.body;
  try {
    await prisma.review.create({
      data: {
        userId: parseInt(userId),
        comment: comment,
        rating: parseInt(rating),
      },
    });
    res.status(200).json({ message: 'Review added successfully!' });
  } catch (error) {
    console.error('Failed to add review:', error);
    res.status(500).send({ error: 'Failed to add review.' });
  }
};

const getAllReviews = async (req, res) => {
  const { id } = req.params;
  try {
    const reviews = await prisma.review.findMany({
      where: {
        userId: parseInt(id),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Failed to get all reviews:', error);
    res.status(500).send({ error: 'Failed to get all reviews.' });
  }
};

const getAverageRating = async (req, res) => {
  const { id } = req.params;
  try {
    const reviews = await prisma.review.findMany({
      where: {
        userId: parseInt(id),
      },
    });
    console.log('reviews', reviews);
    const total = await prisma.review.count({
      where: {
        userId: parseInt(id),
      },
    });
    console.log('total', total);
    let sum = 0;
    for (let i = 0; i < total; i++) {
      sum += reviews[i].rating;
    }
    console.log('sum', sum);
    let average = sum / total;
    console.log('average', average);
    average = Math.round(average * 10) / 10;
    console.log('average', average);
    res.status(200).json({ average: average });
  } catch (error) {
    console.error('Failed to get average rating:', error);
    res.status(500).send({ error: 'Failed to get average rating.' });
  }
};

const addToWishList = async (req, res) => {
  const { userId, postId } = req.body;
  try {
    const check = await prisma.wishList.findMany({
      where: {
        userId: parseInt(userId),
        postId: parseInt(postId),
      },
    });
    if (check.length > 0) {
      return res.status(200).json({ message: 'Post already in wishlist!' });
    }
    await prisma.wishList.create({
      data: {
        userId: parseInt(userId),
        postId: parseInt(postId),
      },
    });
    res.status(200).json({ message: 'Post added to wishlist successfully!' });
  } catch (error) {
    console.error('Failed to add post to wishlist:', error);
    res.status(500).send({ error: 'Failed to add post to wishlist.' });
  }
};

const removeFromWishList = async (req, res) => {
  const { userId, postId } = req.body;
  try {
    await prisma.wishList.deleteMany({
      where: {
        userId: parseInt(userId),
        postId: parseInt(postId),
      },
    });
    res
      .status(200)
      .json({ message: 'Post removed from wishlist successfully!' });
  } catch (error) {
    console.error('Failed to remove post from wishlist:', error);
    res.status(500).send({ error: 'Failed to remove post from wishlist.' });
  }
};

const getWishList = async (req, res) => {
  const { id } = req.params;
  try {
    const wishList = await prisma.wishList.findMany({
      where: {
        userId: parseInt(id),
      },
      include: {
        post: {
          include: {
            user: true,
          },
        },
      },
    });

    // Add photos to each post
    for (let item of wishList) {
      if (item.post && item.post.photosFolder) {
        try {
          const photosPath = path.resolve(item.post.photosFolder);
          const photos = fs.readdirSync(photosPath);
          item.post.photos = photos.map((photo) =>
            path.join(item.post.photosFolder, photo),
          );
        } catch (error) {
          console.error(
            `Failed to read directory ${item.post.photosFolder}:`,
            error,
          );
        }
      }
    }
    res.status(200).json(wishList);
  } catch (error) {
    console.error('Failed to get wishlist:', error);
    res.status(500).send({ error: 'Failed to get wishlist.' });
  }
};

const createReport = async (req, res) => {
  const { userId, url, reportType, reportDescription } = req.body;
  try {
    await prisma.report.create({
      data: {
        userId: parseInt(userId),
        url: url,
        reportType: reportType,
        reportDescription: reportDescription,
      },
    });
    res.status(200).json({ message: 'Report submitted successfully!' });
  } catch (error) {
    console.error('Failed to create report:', error);
    res.status(500).send({ error: 'Failed to create report.' });
  }
};

const getStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
    });
    res.status(200).json({ status: user.status });
  } catch (error) {
    console.error('Failed to get user status:', error);
    res.status(500).send({ error: 'Failed to get user status.' });
  }
};

const getChatList = async (req, res) => {
  const { id } = req.params;
  try {
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          {
            user1Id: parseInt(id),
          },
          {
            user2Id: parseInt(id),
          },
        ],
      },
      include: {
        user1: true,
        user2: true,
        messages: true,
      },
    });
    res.status(200).json(chats);
  } catch (error) {
    console.error('Failed to get chat list:', error);
    res.status(500).send({ error: 'Failed to get chat list.' });
  }
};

const createChat = async (req, res) => {
  const { users } = req.body;
  try {
    const chat = await prisma.chat.create({
      data: {
        user1Id: parseInt(users[0]),
        user2Id: parseInt(users[1]),
      },
    });
    res.status(200).json(chat);
  } catch (error) {
    console.error('Failed to create chat:', error);
    res.status(500).send({ error: 'Failed to create chat.' });
  }
};

const getChat = async (req, res) => {
  const { id } = req.params;
  try {
    const chat = await prisma.chat.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        
        user1: true,
        user2: true,
        messages: true,
      },
    });
    res.status(200).json(chat);
  } catch (error) {
    console.error('Failed to get chat:', error);
    res.status(500).send({ error: 'Failed to get chat.' });
  }
};

const addRoutes = (router) => {
  // router.post('/api/user/update-profile/:id', updateUserProfile);

  router.post('/api/newUser', newUser);
  router.post('/api/user/new-post', newPost);
  router.post(
    '/api/user/add-images-to-new-post',
    uploadPostPictures.array('files'),
    handleUpload,
  );
  // router.post(
  //   '/api/user/upload-profile-picture/:userId',
  //   upload.single('profilePicture'),
  //   handleProfilePictureUpload,
  // );
  // router.get('/api/user/get-posts/:userId', getUserPosts);
  //vin
  // router.put('/api/user/edit-a-post/:postId', editPost); //maybe add userId?
  // router.post('/api/user/remove-post/', removePost); //here too

  router.get('/api/user/get-post/:postId', getUserPost);
  // ---------------------------------------------------------------
  router.patch('/api/user/updateProfile', updateProfile);
  router.post(
    '/api/user/updateProfile/updateProfilePicture/',
    uploadProfilePicture.single('file'),
    updateProfilePicture,
  );
  router.get('/api/user/getPostsForUser/:userId', getUserPosts);
  router.patch('/api/post/archivePost', archivePost);
  router.patch('/api/post/updatePost', updatePost);

  router.get('/api/post/:postId', getPost);

  router.get('/api/getAllPosts', getAllPosts);
  router.post('/api/getFilteredPosts', getFilteredPosts);

  router.post('/api/getUser', getUser);

  router.get('/api/getUserById/:id', getUserById);

  router.post('/api/user/addAReview', addAReview);
  router.get('/api/user/getAllReviews/:id', getAllReviews);
  router.get('/api/user/getAverageRating/:id', getAverageRating);
  router.post('/api/user/addToWishList', addToWishList);
  router.post('/api/user/removeFromWishList', removeFromWishList);
  router.get('/api/user/getWishList/:id', getWishList);
  router.post('/api/report/createReport', createReport);

  router.get('/api/user/getStatus/:id', getStatus);
  router.get('/api/user/getChatList/:id', getChatList);
  router.post('/api/user/createChat', createChat);
  router.get('/api/user/getChat/:id', getChat);
};

module.exports = {
  addRoutes,
};
