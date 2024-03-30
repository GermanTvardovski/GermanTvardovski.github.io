

const url = "https://youtube.com"
//            ^
//СЮДА ССЫЛКУ |


const prizes = [
  {
    text: "Скидка 5% процентов на любой пакет",
    color: "hsl(228, 53%, 37%)",
  },
  {
    text: "Виджет «Стадный инстинкт» в подарок",
    color: "hsl(228, 58%, 45%)",
  },
  {
    text: "Бесплатная установка виджета",
    color: "hsl(228, 53%, 37%)",
  },
  {
    text: "Два пресета цветов по цене одного",
    color: "hsl(228, 58%, 45%)",
  },
  {
    text: "Год премиум поддержки в подарок",
    color: "hsl(228, 53%, 37%)",
  },
  {
    text: "Скидка 10% на любой пакет",
    color: "hsl(228, 58%, 45%)",
  },
  {
    text: "Виджет «Juicy Contact» в подарок",
    color: "hsl(228, 53%, 37%)",
  },
  {
    text: "Бесплатная настройка виджета",
    color: "hsl(228, 58%, 45%)",
  }
];

const wheel = document.querySelector(".wheel");
const spinner = wheel.querySelector(".spinner");
const trigger = document.querySelector(".btn-spin");
const ticker = document.querySelector(".ticker");
const take = document.querySelector(".btn-take");

// на сколько секторов нарезаем круг
const prizeSlice = 360 / prizes.length;
// на какое расстояние смещаем сектора друг относительно друга
const prizeOffset = Math.floor(180 / prizes.length);
// прописываем CSS-классы, которые будем добавлять и убирать из стилей
const spinClass = "is-spinning";
const selectedClass = "selected";
// получаем все значения параметров стилей у секторов
const spinnerStyles = window.getComputedStyle(spinner);
// переменная для анимации
let tickerAnim;
// угол вращения
let rotation = 0;
// текущий сектор
let currentSlice = 0;
// переменная для текстовых подписей
let prizeNodes;

const createConicGradient = () => {
  // устанавливаем нужное значение стиля у элемента spinner
  spinner.setAttribute(
    "style",
    `background: conic-gradient(
      from -90deg,
      ${prizes
        // получаем цвет текущего сектора
        .map(({ color }, i) => `${color} 0 ${(100 / prizes.length) * (prizes.length - i)}%`)
        .reverse()
      }
    );`
  );
};

const createPrizeNodes = () => {
  // обрабатываем каждую подпись
  prizes.forEach(({ text, color, reaction }, i) => {
    // каждой из них назначаем свой угол поворота
    const rotation = ((prizeSlice * i) * -1) - prizeOffset;
    // добавляем код с размещением текста на страницу в конец блока spinner
    spinner.insertAdjacentHTML(
      "beforeend",
      // текст при этом уже оформлен нужными стилями
      `<li class="prize" data-reaction=${reaction} style="--rotate: ${rotation}deg">
        <span class="text">${text}</span>
      </li>`
    );
  });
};

// создаём функцию, которая нарисует колесо в сборе
const setupWheel = () => {
    // сначала секторы
    createConicGradient();
    // потом текст
    createPrizeNodes();
    // а потом мы получим список всех призов на странице, чтобы работать с ними как с объектами
    prizeNodes = wheel.querySelectorAll(".prize");
};

setupWheel();

const spinertia = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// отслеживаем нажатие на кнопку
trigger.addEventListener("click", () => {
    s = ' ';
    s = s.replace(/^\s+|\s+$/g, '');
    if(!document.getElementById("agree").checked && document.getElementById("inputN").value == s) {
        document.getElementById("NickN").style.display = "block";
        document.getElementById("agreel").style.color = "red";
    }
    else if(!document.getElementById("agree").checked) {
        document.getElementById("NickN").style.display = "none";
        document.getElementById("agreel").style.color = "red";
    }
    else if(document.getElementById("inputN").value == s) {
        document.getElementById("agreel").style.color = "#fff";
        document.getElementById("NickN").style.display = "block";
    }
    else {
        document.getElementById("NickN").style.display = "none";
        document.getElementById("agreel").style.color = "#fff";
        // делаем её недоступной для нажатия
        trigger.disabled = true;
        // задаём начальное вращение колеса
        rotation = Math.floor(Math.random() * 360 + spinertia(2000, 5000));
        // убираем прошлый приз
        prizeNodes.forEach((prize) => prize.classList.remove(selectedClass));
        // добавляем колесу класс is-spinning, с помощью которого реализуем нужную отрисовку
        wheel.classList.add(spinClass);
        // через CSS говорим секторам, как им повернуться
        if(!window.matchMedia("(max-width: 800px)").matches) {
            spinner.style.setProperty("--rotate", rotation+180);
        }
        else {
            spinner.style.setProperty("--rotate", rotation+270);
        }
        // возвращаем язычок в горизонтальную позицию
        ticker.style.animation = "none";
        // запускаем анимацию вращение
        runTickerAnimation();
    }
});

const runTickerAnimation = () => {
  // взяли код анимации отсюда: https://css-tricks.com/get-value-of-css-rotation-through-javascript/
  const values = spinnerStyles.transform.split("(")[1].split(")")[0].split(",");
  const a = values[0];
  const b = values[1];
  let rad = Math.atan2(b, a);

  if (rad < 0) rad += (2 * Math.PI);

  const angle = Math.round(rad * (180 / Math.PI));
  const slice = Math.floor(angle / prizeSlice);

  // анимация язычка, когда его задевает колесо при вращении
  // если появился новый сектор
  if (currentSlice !== slice) {
    // убираем анимацию язычка
    ticker.style.animation = "none";
    // и через 10 миллисекунд отменяем это, чтобы он вернулся в первоначальное положение
    setTimeout(() => ticker.style.animation = null, 10);
    // после того как язычок прошёл сектор — делаем его текущим
    currentSlice = slice;
  }
  // запускаем анимацию
  tickerAnim = requestAnimationFrame(runTickerAnimation);
};

spinner.addEventListener("transitionend", () => {
  // останавливаем отрисовку вращения
  cancelAnimationFrame(tickerAnim);
  // получаем текущее значение поворота колеса
  as = rotation%360;
  if(!window.matchMedia("(max-width: 800px)").matches) {
    rotation += 180;
  }
  else {
    rotation += 270;
  }
  // выбираем приз
  selectPrize();
  // убираем класс, который отвечает за вращение
  wheel.classList.remove(spinClass);
  // отправляем в CSS новое положение поворота колеса
  spinner.style.setProperty("--rotate", rotation);
  // делаем кнопку снова активной
  trigger.disabled = false;
});

take.onclick = function(event) {
    window.location.href = url;
};

const selectPrize = () => {
const selected = Math.floor((as) / prizeSlice);
    prizeNodes[selected].classList.add(selectedClass);
    document.getElementById("zagt").innerHTML = prizeNodes[selected].textContent;
    document.getElementById("vigi").style.display = "block";
    document.getElementById("ini").style.display = "none";
    document.getElementById("tekstiki").style.display = "none";
    document.getElementById("chbi").style.display = "none";
    document.getElementById("btn-spini").style.display = "none"
    document.getElementById("btn-takei").style.display = "block"
};
